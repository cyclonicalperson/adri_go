using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace TouristGuide.Api.Hubs
{
    [Authorize(Roles = "tourist")]
    public class TouristNotificationHub : Hub
    {
        private readonly ILogger<TouristNotificationHub> _logger;

        public TouristNotificationHub(ILogger<TouristNotificationHub> logger)
        {
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            var touristId = GetTouristId();
            if (touristId is not null)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(touristId));
                _logger.LogInformation("[Hub] Tourist {Id} connected", touristId);
            }

            await base.OnConnectedAsync();
        }

        public Task JoinTouristGroup()
        {
            var touristId = GetTouristId();
            return touristId is null
                ? Task.CompletedTask
                : Groups.AddToGroupAsync(Context.ConnectionId, GroupName(touristId));
        }

        public static string GroupName(string touristId) => $"tourist_{touristId}";

        public static string GroupName(uint touristId) => GroupName(touristId.ToString());

        private string? GetTouristId() =>
            Context.User?.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
    }
}
