using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace TouristGuide.Api.Hubs
{
    /// <summary>
    /// SignalR Hub za real-time notifikacije admin korisnicima.
    /// 
    /// Svaki admin se konektuje i automatski pridružuje grupi "admin_{id}".
    /// SuperAdmin se dodatno dodaje u grupu "superadmins".
    /// 
    /// Frontend koristi:
    ///   connection.invoke("JoinAdminGroup")
    ///   connection.on("NewNotification", (notif) => ...)
    ///   connection.on("NotificationRead", (id) => ...)
    ///   connection.on("UnreadCountUpdated", (count) => ...)
    /// </summary>
    [Authorize(Roles = "admin,superadmin")]
    public class AdminNotificationHub : Hub
    {
        private readonly ILogger<AdminNotificationHub> _logger;

        public AdminNotificationHub(ILogger<AdminNotificationHub> logger)
        {
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            var adminId = GetAdminId();
            var isSuperAdmin = string.Equals(
                Context.User?.FindFirstValue(ClaimTypes.Role),
                "superadmin",
                StringComparison.OrdinalIgnoreCase);

            if (adminId is not null)
            {
                // Svaki admin ima svoju grupu admin_{id}
                await Groups.AddToGroupAsync(Context.ConnectionId, $"admin_{adminId}");

                if (isSuperAdmin)
                    await Groups.AddToGroupAsync(Context.ConnectionId, "superadmins");

                _logger.LogInformation(
                    "[Hub] Admin {Id} connected (superadmin={SA})", adminId, isSuperAdmin);
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            _logger.LogInformation("[Hub] Client disconnected: {Id}", Context.ConnectionId);
            await base.OnDisconnectedAsync(exception);
        }

        /// <summary>Klijent ručno poziva JoinAdminGroup ako mu treba eksplicitna potvrda.</summary>
        public async Task JoinAdminGroup()
        {
            var adminId = GetAdminId();
            if (adminId is not null)
                await Groups.AddToGroupAsync(Context.ConnectionId, $"admin_{adminId}");
        }

        // ── Helpers ──────────────────────────────────────────────────────
        private string? GetAdminId() =>
            Context.User?.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
    }
}
// Note: using statement needed at top of file
// Already referenced above through System.Security.Claims