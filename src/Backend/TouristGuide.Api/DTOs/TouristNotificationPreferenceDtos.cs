namespace TouristGuide.Api.DTOs
{
    public class TouristNotificationPreferenceDto
    {
        public string NotificationType { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public bool InAppEnabled { get; set; }
        public bool PushEnabled { get; set; }
        public bool EmailEnabled { get; set; }
        public bool EmailAvailable { get; set; }
        public bool CanMute { get; set; } = true;
    }

    public class TouristNotificationPreferenceUpdateDto
    {
        public string NotificationType { get; set; } = string.Empty;
        public bool? InAppEnabled { get; set; }
        public bool? PushEnabled { get; set; }
        public bool? EmailEnabled { get; set; }
    }
}
