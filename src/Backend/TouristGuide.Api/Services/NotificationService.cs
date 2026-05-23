using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;
using TouristGuide.Api.Hubs;
using TouristGuide.Api.Models;

namespace TouristGuide.Api.Services
{
    /// <summary>
    /// Centralni servis za kreiranje i slanje admin notifikacija.
    /// 
    /// Koristi IHubContext da pošalje real-time event specifičnom adminu ili svim superadminima.
    /// Svaka notifikacija se i čuva u bazi (admin_notification tabela).
    /// 
    /// Primjer upotrebe iz kontrolera:
    ///   await _notifService.SendToAdminAsync(adminId, "new_review", "Nova recenzija", "...", payload);
    ///   await _notifService.BroadcastToSuperAdminsAsync("new_registration", "Novi zahtev", "...", payload);
    /// </summary>
    public class NotificationService
    {
        private readonly IHubContext<AdminNotificationHub> _hub;
        private readonly AppDbContext _db;
        private readonly ILogger<NotificationService> _logger;

        public NotificationService(
            IHubContext<AdminNotificationHub> hub,
            AppDbContext db,
            ILogger<NotificationService> logger)
        {
            _hub = hub;
            _db = db;
            _logger = logger;
        }

        // ── Pošalji notifikaciju jednom adminu ───────────────────────────
        public async Task SendToAdminAsync(
            uint adminId,
            string type,
            string title,
            string body,
            object? payload = null)
        {
            var notif = await PersistAsync(adminId, type, title, body, payload);
            await _hub.Clients
                .Group($"admin_{adminId}")
                .SendAsync("NewNotification", MapToDto(notif));

            // Pošalji ažurirani unread count
            await BroadcastUnreadCountAsync(adminId);
        }

        // ── Broadcast svim superadminima ─────────────────────────────────
        public async Task BroadcastToSuperAdminsAsync(
            string type,
            string title,
            string body,
            object? payload = null)
        {
            // Dohvati sve superadmine iz baze
            var superAdminIds = await _db.AdminUsers
                .Where(a => a.Role == "superadmin" && a.AccountStatus == "active")
                .Select(a => a.Id)
                .ToListAsync();

            foreach (var id in superAdminIds)
            {
                var notif = await PersistAsync(id, type, title, body, payload);
                await _hub.Clients
                    .Group($"admin_{id}")
                    .SendAsync("NewNotification", MapToDto(notif));
            }

            // Single broadcast za sve superadmine u grupi "superadmins"
            await _hub.Clients
                .Group("superadmins")
                .SendAsync("UnreadCountUpdated", -1); // -1 = signalizira refetch
        }

        // ── Označi notifikaciju kao pročitanu i obavijesti klijenta ──────
        public async Task MarkReadAsync(uint notificationId, uint adminId)
        {
            var notif = await _db.AdminNotifications
                .FirstOrDefaultAsync(n => n.Id == notificationId && n.AdminUserId == adminId);
            if (notif is null) return;

            notif.IsRead = true;
            notif.SentAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            await _hub.Clients
                .Group($"admin_{adminId}")
                .SendAsync("NotificationRead", notificationId);
            await BroadcastUnreadCountAsync(adminId);
        }

        public async Task BroadcastUnreadCountAsync(uint adminId)
        {
            var unread = await _db.AdminNotifications
                .CountAsync(n => n.AdminUserId == adminId && !n.IsRead);

            await _hub.Clients
                .Group($"admin_{adminId}")
                .SendAsync("UnreadCountUpdated", unread);
        }

        public async Task BroadcastAllReadAsync(uint adminId)
        {
            await _hub.Clients
                .Group($"admin_{adminId}")
                .SendAsync("AllNotificationsRead");
            await BroadcastUnreadCountAsync(adminId);
        }

        public async Task BroadcastNotificationDeletedAsync(uint adminId, uint notificationId)
        {
            await _hub.Clients
                .Group($"admin_{adminId}")
                .SendAsync("NotificationDeleted", notificationId);
            await BroadcastUnreadCountAsync(adminId);
        }

        public async Task BroadcastNotificationsClearedAsync(uint adminId)
        {
            await _hub.Clients
                .Group($"admin_{adminId}")
                .SendAsync("NotificationsCleared");
            await BroadcastUnreadCountAsync(adminId);
        }

        // ── Private helpers ──────────────────────────────────────────────
        private async Task<AdminNotification> PersistAsync(
            uint adminId, string type, string title, string body, object? payload)
        {
            var notif = new AdminNotification
            {
                AdminUserId = adminId,
                Type = type,
                Title = title,
                Body = body,
                Payload = payload is not null
                    ? System.Text.Json.JsonSerializer.Serialize(payload)
                    : null,
                IsRead = false,
                CreatedAt = DateTime.UtcNow,
            };
            _db.AdminNotifications.Add(notif);
            await _db.SaveChangesAsync();
            return notif;
        }

        private static object MapToDto(AdminNotification n) => new
        {
            id = n.Id,
            adminUserId = n.AdminUserId,
            type = n.Type,
            title = n.Title,
            body = n.Body,
            payload = n.Payload,
            isRead = n.IsRead,
            createdAt = n.CreatedAt,
            sentAt = n.SentAt,
        };
    }
}
