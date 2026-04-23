using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;
using TouristGuide.Api.Services;

namespace TouristGuide.Api.Controllers
{
    /// <summary>
    /// CRUD endpoints za admin notifikacije.
    /// SignalR push šalje NotificationService; ovaj kontroler služi za REST
    /// (inicijalni load, označavanje pročitanog, brisanje).
    /// </summary>
    [ApiController]
    [Route("api/notifications")]
    [Authorize(Roles = "admin,superadmin")]
    public class NotificationsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly NotificationService _notifService;

        public NotificationsController(AppDbContext db, NotificationService notifService)
        {
            _db = db;
            _notifService = notifService;
        }

        // ── GET /api/notifications?limit=20 ───────────────────────────────────
        [HttpGet]
        public async Task<IActionResult> GetMine([FromQuery] int limit = 20)
        {
            var adminId = GetAdminId();
            if (adminId is null) return Unauthorized();

            var items = await _db.AdminNotifications
                .Where(n => n.AdminUserId == adminId.Value)
                .OrderByDescending(n => n.CreatedAt)
                .Take(Math.Min(limit, 100))
                .Select(n => new
                {
                    n.Id,
                    adminUserId = n.AdminUserId,
                    n.Type,
                    n.Title,
                    n.Body,
                    n.Payload,
                    isRead = n.IsRead,
                    createdAt = n.CreatedAt,
                    sentAt = n.SentAt,
                })
                .ToListAsync();

            return Ok(new { data = items, success = true });
        }

        // ── GET /api/notifications/unread-count ───────────────────────────────
        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            var adminId = GetAdminId();
            if (adminId is null) return Unauthorized();

            var count = await _db.AdminNotifications
                .CountAsync(n => n.AdminUserId == adminId.Value && !n.IsRead);

            return Ok(new { data = new { count }, success = true });
        }

        // ── PATCH /api/notifications/{id}/read ───────────────────────────────
        [HttpPatch("{id}/read")]
        public async Task<IActionResult> MarkRead(uint id)
        {
            var adminId = GetAdminId();
            if (adminId is null) return Unauthorized();

            await _notifService.MarkReadAsync(id, adminId.Value);
            return Ok(new { success = true });
        }

        // ── PATCH /api/notifications/read-all ────────────────────────────────
        [HttpPatch("read-all")]
        public async Task<IActionResult> MarkAllRead()
        {
            var adminId = GetAdminId();
            if (adminId is null) return Unauthorized();

            var unread = await _db.AdminNotifications
                .Where(n => n.AdminUserId == adminId.Value && !n.IsRead)
                .ToListAsync();

            foreach (var n in unread)
            {
                n.IsRead = true;
                n.SentAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();

            // Ažuriraj unread count klijenta
            await _notifService.MarkReadAsync(0, adminId.Value); // count = 0
            return Ok(new { success = true, count = unread.Count });
        }

        // ── DELETE /api/notifications/{id} ────────────────────────────────────
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(uint id)
        {
            var adminId = GetAdminId();
            if (adminId is null) return Unauthorized();

            var notif = await _db.AdminNotifications
                .FirstOrDefaultAsync(n => n.Id == id && n.AdminUserId == adminId.Value);
            if (notif is null) return NotFound();

            _db.AdminNotifications.Remove(notif);
            await _db.SaveChangesAsync();
            return Ok(new { success = true });
        }

        private uint? GetAdminId()
        {
            var val = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                   ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
            return uint.TryParse(val, out var id) ? id : null;
        }
    }
}