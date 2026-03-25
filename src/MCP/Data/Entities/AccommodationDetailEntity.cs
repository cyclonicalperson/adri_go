namespace Mcp.Data.Entities;

internal sealed class AccommodationDetailEntity
{
    public int ObjectId { get; set; }
    public string AccommodationType { get; set; } = string.Empty;
    public decimal PricePerNight { get; set; }
    public string Currency { get; set; } = string.Empty;
    public int GuestCapacity { get; set; }
    public int? RoomCount { get; set; }
    public int? BedCount { get; set; }
    public int? BathroomCount { get; set; }
    public TimeOnly? CheckInTime { get; set; }
    public TimeOnly? CheckOutTime { get; set; }
    public string? BookingUrl { get; set; }
    public string? AirbnbUrl { get; set; }
}
