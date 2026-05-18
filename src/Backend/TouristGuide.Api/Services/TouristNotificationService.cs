using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;
using TouristGuide.Api.DTOs;
using TouristGuide.Api.DTOs.Recommendations;
using TouristGuide.Api.Hubs;
using TouristGuide.Api.Models;

namespace TouristGuide.Api.Services
{
    public static class TouristNotificationTypes
    {
        public const string Calendar = "calendar";
        public const string ReviewApproved = "review_approved";
        public const string ReviewRejected = "review_rejected";
        public const string PersonalizedRecommendation = "personalized_recommendation";
        public const string ImportantAlert = "important_alert";
    }

    public static class TouristNotificationPreferenceTypes
    {
        public const string Calendar = "calendar";
        public const string ReviewStatus = "review_status";
        public const string PersonalizedRecommendation = "personalized_recommendation";
        public const string ImportantAlert = "important_alert";
        public const string TripDigest = "trip_digest";
    }

    internal sealed record TouristNotificationPreferenceDefinition(
        string NotificationType,
        string Label,
        bool InAppEnabled,
        bool PushEnabled,
        bool EmailEnabled,
        bool EmailAvailable,
        bool CanMute);

    internal sealed record ResolvedNotificationPreference(
        string NotificationType,
        bool InAppEnabled,
        bool PushEnabled,
        bool EmailEnabled);

    /// <summary>
    /// Central place for tourist-facing in-app notifications.
    /// Email is intentionally not sent from here; account/security and digest emails stay in EmailService.
    /// </summary>
    public class TouristNotificationService
    {
        private static readonly JsonSerializerOptions PayloadJsonOptions = new(JsonSerializerDefaults.Web);
        private static readonly TimeSpan RecommendationQuietPeriod = TimeSpan.FromHours(12);
        private static readonly TouristNotificationPreferenceDefinition[] DefaultPreferenceDefinitions =
        {
            new(TouristNotificationPreferenceTypes.Calendar, "Calendar", true, true, false, false, true),
            new(TouristNotificationPreferenceTypes.ReviewStatus, "Review status", true, true, false, false, true),
            new(TouristNotificationPreferenceTypes.PersonalizedRecommendation, "Personalized recommendations", true, true, false, false, true),
            new(TouristNotificationPreferenceTypes.ImportantAlert, "Important alerts", true, true, false, false, false),
            new(TouristNotificationPreferenceTypes.TripDigest, "Trip digest", false, false, false, true, true),
        };

        private readonly AppDbContext _db;
        private readonly IHubContext<TouristNotificationHub> _hub;
        private readonly ILogger<TouristNotificationService> _logger;

        public TouristNotificationService(
            AppDbContext db,
            IHubContext<TouristNotificationHub> hub,
            ILogger<TouristNotificationService> logger)
        {
            _db = db;
            _hub = hub;
            _logger = logger;
        }

        public Task<Notification?> QueueCalendarItemAddedAsync(
            uint touristId,
            uint postId,
            string postTitle,
            CancellationToken cancellationToken = default)
        {
            return QueueInAppNotificationAsync(
                touristId,
                TouristNotificationTypes.Calendar,
                "Added to calendar",
                $"{postTitle} is now in your travel calendar.",
                new
                {
                    postId,
                    url = "/calendar",
                },
                pushEligible: true,
                cancellationToken);
        }

        public Task<Notification?> QueueReviewStatusUpdateAsync(
            Review review,
            string? previousStatus,
            string? rejectionReason,
            CancellationToken cancellationToken = default)
        {
            if (review.TouristId is null)
                return Task.FromResult<Notification?>(null);

            if (string.Equals(previousStatus, review.Status, StringComparison.OrdinalIgnoreCase))
                return Task.FromResult<Notification?>(null);

            if (review.Status != "APPROVED" && review.Status != "REJECTED")
                return Task.FromResult<Notification?>(null);

            var entityTitle = review.Post?.Title ?? review.Route?.Name ?? "your contribution";
            var approved = review.Status == "APPROVED";
            var title = approved ? "Review approved" : "Review needs changes";
            var body = approved
                ? $"Your review for {entityTitle} is now visible to travelers."
                : string.IsNullOrWhiteSpace(rejectionReason)
                    ? $"Your review for {entityTitle} was not approved by moderation."
                    : $"Your review for {entityTitle} was not approved: {rejectionReason.Trim()}";

            return QueueInAppNotificationAsync(
                review.TouristId.Value,
                approved ? TouristNotificationTypes.ReviewApproved : TouristNotificationTypes.ReviewRejected,
                title,
                body,
                new
                {
                    reviewId = review.Id,
                    postId = review.PostId,
                    routeId = review.RouteId,
                    status = review.Status,
                    url = review.PostId.HasValue ? $"/location-details/{review.PostId.Value}" : "/routes",
                },
                pushEligible: true,
                cancellationToken);
        }

        public async Task<Notification?> NotifyPersonalizedRecommendationsAsync(
            uint touristId,
            uint regionId,
            IReadOnlyList<ContentRecommendationItemDto> recommendations,
            CancellationToken cancellationToken = default)
        {
            if (recommendations.Count == 0)
                return null;

            var quietPeriodStartedAt = DateTime.UtcNow.Subtract(RecommendationQuietPeriod);
            var hasRecentNotification = await _db.Notifications.AnyAsync(
                n => n.TouristId == touristId
                    && n.Type == TouristNotificationTypes.PersonalizedRecommendation
                    && n.CreatedAt >= quietPeriodStartedAt,
                cancellationToken);

            if (hasRecentNotification)
                return null;

            var top = recommendations[0];
            var remainingCount = recommendations.Count - 1;
            var body = remainingCount > 0
                ? $"{top.Title} and {remainingCount} more picks match your travel interests."
                : $"{top.Title} matches your travel interests.";

            return await SendInAppNotificationAsync(
                touristId,
                TouristNotificationTypes.PersonalizedRecommendation,
                "New recommendations for you",
                body,
                new
                {
                    regionId,
                    entityId = top.EntityId,
                    entityType = top.EntityType,
                    count = recommendations.Count,
                    url = string.Equals(top.EntityType, "route", StringComparison.OrdinalIgnoreCase)
                        ? "/routes"
                        : $"/location-details/{top.EntityId}",
                },
                pushEligible: true,
                cancellationToken);
        }

        public Task<Notification?> SendImportantAlertAsync(
            uint touristId,
            string title,
            string body,
            object? payload = null,
            CancellationToken cancellationToken = default)
        {
            return SendInAppNotificationAsync(
                touristId,
                TouristNotificationTypes.ImportantAlert,
                title,
                body,
                payload,
                pushEligible: true,
                cancellationToken);
        }

        public async Task<Notification?> SendInAppNotificationAsync(
            uint touristId,
            string type,
            string title,
            string body,
            object? payload = null,
            bool pushEligible = true,
            CancellationToken cancellationToken = default)
        {
            var notification = await QueueInAppNotificationAsync(touristId, type, title, body, payload, pushEligible, cancellationToken);
            if (notification is null)
                return null;

            await _db.SaveChangesAsync(cancellationToken);
            await DispatchAsync(notification, cancellationToken);
            return notification;
        }

        public async Task<Notification?> QueueInAppNotificationAsync(
            uint touristId,
            string type,
            string title,
            string body,
            object? payload = null,
            bool pushEligible = true,
            CancellationToken cancellationToken = default)
        {
            var preference = await ResolvePreferenceAsync(touristId, type, pushEligible, cancellationToken);
            if (!preference.InAppEnabled)
                return null;

            var notification = new Notification
            {
                TouristId = touristId,
                Type = type,
                Title = title,
                Body = body,
                Payload = SerializePayload(payload, preference.PushEnabled, preference.EmailEnabled),
                IsRead = false,
                CreatedAt = DateTime.UtcNow,
            };

            _db.Notifications.Add(notification);
            return notification;
        }

        public async Task DispatchAsync(Notification? notification, CancellationToken cancellationToken = default)
        {
            if (notification is null)
                return;

            try
            {
                var dto = MapToDto(notification);
                await _hub.Clients
                    .Group(TouristNotificationHub.GroupName(notification.TouristId))
                    .SendAsync("NewNotification", dto, cancellationToken);

                await BroadcastUnreadCountAsync(notification.TouristId, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to dispatch tourist notification {NotificationId}", notification.Id);
            }
        }

        public async Task BroadcastUnreadCountAsync(uint touristId, CancellationToken cancellationToken = default)
        {
            var unread = await _db.Notifications.CountAsync(
                n => n.TouristId == touristId && !n.IsRead,
                cancellationToken);

            await _hub.Clients
                .Group(TouristNotificationHub.GroupName(touristId))
                .SendAsync("UnreadCountUpdated", unread, cancellationToken);
        }

        public async Task BroadcastNotificationReadAsync(uint touristId, uint notificationId, CancellationToken cancellationToken = default)
        {
            await _hub.Clients
                .Group(TouristNotificationHub.GroupName(touristId))
                .SendAsync("NotificationRead", notificationId, cancellationToken);
            await BroadcastUnreadCountAsync(touristId, cancellationToken);
        }

        public async Task BroadcastAllReadAsync(uint touristId, CancellationToken cancellationToken = default)
        {
            await _hub.Clients
                .Group(TouristNotificationHub.GroupName(touristId))
                .SendAsync("AllNotificationsRead", cancellationToken);
            await BroadcastUnreadCountAsync(touristId, cancellationToken);
        }

        public async Task BroadcastNotificationDeletedAsync(uint touristId, uint notificationId, CancellationToken cancellationToken = default)
        {
            await _hub.Clients
                .Group(TouristNotificationHub.GroupName(touristId))
                .SendAsync("NotificationDeleted", notificationId, cancellationToken);
            await BroadcastUnreadCountAsync(touristId, cancellationToken);
        }

        public async Task<IReadOnlyList<TouristNotificationPreferenceDto>> GetPreferencesAsync(
            uint touristId,
            CancellationToken cancellationToken = default)
        {
            var stored = await _db.TouristNotificationPreferences
                .AsNoTracking()
                .Where(p => p.TouristId == touristId)
                .ToListAsync(cancellationToken);

            var byType = stored.ToDictionary(p => p.NotificationType, StringComparer.OrdinalIgnoreCase);
            return DefaultPreferenceDefinitions
                .Select(definition =>
                {
                    byType.TryGetValue(definition.NotificationType, out var value);
                    return MapPreference(definition, value);
                })
                .ToList();
        }

        public async Task<IReadOnlyList<TouristNotificationPreferenceDto>> UpdatePreferencesAsync(
            uint touristId,
            IReadOnlyList<TouristNotificationPreferenceUpdateDto> updates,
            CancellationToken cancellationToken = default)
        {
            var normalizedUpdates = updates
                .Select(update => new
                {
                    Type = NormalizePreferenceType(update.NotificationType),
                    update.InAppEnabled,
                    update.PushEnabled,
                    update.EmailEnabled,
                })
                .ToList();

            var requestedTypes = normalizedUpdates.Select(update => update.Type).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            var existing = await _db.TouristNotificationPreferences
                .Where(p => p.TouristId == touristId && requestedTypes.Contains(p.NotificationType))
                .ToListAsync(cancellationToken);
            var existingByType = existing.ToDictionary(p => p.NotificationType, StringComparer.OrdinalIgnoreCase);

            foreach (var update in normalizedUpdates)
            {
                var definition = GetDefinition(update.Type);
                if (!existingByType.TryGetValue(update.Type, out var preference))
                {
                    preference = new TouristNotificationPreference
                    {
                        TouristId = touristId,
                        NotificationType = update.Type,
                        InAppEnabled = definition.InAppEnabled,
                        PushEnabled = definition.PushEnabled,
                        EmailEnabled = definition.EmailEnabled,
                    };
                    _db.TouristNotificationPreferences.Add(preference);
                    existingByType[update.Type] = preference;
                }

                preference.InAppEnabled = definition.CanMute
                    ? update.InAppEnabled ?? preference.InAppEnabled
                    : true;
                preference.PushEnabled = update.PushEnabled ?? preference.PushEnabled;
                preference.EmailEnabled = definition.EmailAvailable
                    ? update.EmailEnabled ?? preference.EmailEnabled
                    : false;
                preference.UpdatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync(cancellationToken);
            return await GetPreferencesAsync(touristId, cancellationToken);
        }

        private async Task<ResolvedNotificationPreference> ResolvePreferenceAsync(
            uint touristId,
            string notificationType,
            bool pushEligible,
            CancellationToken cancellationToken)
        {
            var preferenceType = ToPreferenceType(notificationType);
            var definition = GetDefinition(preferenceType);
            var stored = await _db.TouristNotificationPreferences
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    p => p.TouristId == touristId && p.NotificationType == preferenceType,
                    cancellationToken);

            var inAppEnabled = definition.CanMute
                ? stored?.InAppEnabled ?? definition.InAppEnabled
                : true;

            return new ResolvedNotificationPreference(
                preferenceType,
                inAppEnabled,
                pushEligible && (stored?.PushEnabled ?? definition.PushEnabled),
                definition.EmailAvailable && (stored?.EmailEnabled ?? definition.EmailEnabled));
        }

        private static TouristNotificationPreferenceDto MapPreference(
            TouristNotificationPreferenceDefinition definition,
            TouristNotificationPreference? stored)
        {
            return new TouristNotificationPreferenceDto
            {
                NotificationType = definition.NotificationType,
                Label = definition.Label,
                InAppEnabled = definition.CanMute ? stored?.InAppEnabled ?? definition.InAppEnabled : true,
                PushEnabled = stored?.PushEnabled ?? definition.PushEnabled,
                EmailEnabled = definition.EmailAvailable && (stored?.EmailEnabled ?? definition.EmailEnabled),
                EmailAvailable = definition.EmailAvailable,
                CanMute = definition.CanMute,
            };
        }

        private static TouristNotificationPreferenceDefinition GetDefinition(string preferenceType)
        {
            return DefaultPreferenceDefinitions.First(definition =>
                string.Equals(definition.NotificationType, preferenceType, StringComparison.OrdinalIgnoreCase));
        }

        private static string NormalizePreferenceType(string notificationType)
        {
            var normalized = (notificationType ?? string.Empty).Trim().ToLowerInvariant();
            if (DefaultPreferenceDefinitions.Any(definition =>
                string.Equals(definition.NotificationType, normalized, StringComparison.OrdinalIgnoreCase)))
            {
                return normalized;
            }

            throw new ArgumentException($"Unsupported notification type: {notificationType}", nameof(notificationType));
        }

        private static string ToPreferenceType(string notificationType)
        {
            var normalized = (notificationType ?? string.Empty).Trim().ToLowerInvariant();
            return normalized switch
            {
                TouristNotificationTypes.Calendar => TouristNotificationPreferenceTypes.Calendar,
                TouristNotificationTypes.ReviewApproved => TouristNotificationPreferenceTypes.ReviewStatus,
                TouristNotificationTypes.ReviewRejected => TouristNotificationPreferenceTypes.ReviewStatus,
                TouristNotificationTypes.PersonalizedRecommendation => TouristNotificationPreferenceTypes.PersonalizedRecommendation,
                TouristNotificationTypes.ImportantAlert => TouristNotificationPreferenceTypes.ImportantAlert,
                TouristNotificationPreferenceTypes.TripDigest => TouristNotificationPreferenceTypes.TripDigest,
                _ => TouristNotificationPreferenceTypes.ImportantAlert,
            };
        }

        private static object MapToDto(Notification n) => new
        {
            id = n.Id,
            n.Type,
            n.Title,
            n.Body,
            n.Payload,
            isRead = n.IsRead,
            createdAt = n.CreatedAt,
            sentAt = n.SentAt,
        };

        private static string SerializePayload(object? payload, bool pushEligible, bool emailEligible)
        {
            var envelope = new Dictionary<string, object?>(StringComparer.Ordinal);

            if (payload is not null)
            {
                var payloadJson = JsonSerializer.Serialize(payload, PayloadJsonOptions);
                using var payloadDocument = JsonDocument.Parse(payloadJson);

                if (payloadDocument.RootElement.ValueKind == JsonValueKind.Object)
                {
                    foreach (var property in payloadDocument.RootElement.EnumerateObject())
                        envelope[property.Name] = property.Value.Clone();
                }
                else
                {
                    envelope["data"] = payloadDocument.RootElement.Clone();
                }
            }

            envelope["channel"] = "in_app";
            envelope["pushEligible"] = pushEligible;
            envelope["emailEligible"] = emailEligible;

            return JsonSerializer.Serialize(envelope, PayloadJsonOptions);
        }
    }
}
