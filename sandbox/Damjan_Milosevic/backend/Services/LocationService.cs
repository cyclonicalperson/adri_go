using System.Globalization;
using Microsoft.EntityFrameworkCore;

public class LocationService
{
    private readonly AppDbContext _context;

    public LocationService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<Location>> GetLocationsByCategory(int category)
    {
        return await _context.Locations
            .Where(l => l.CategoryId == category)
            .ToListAsync();
    }

    public async Task<List<Location>> GetTopLocations(int category)
    {
        return await _context.Locations
            .Where(l => l.CategoryId == category)
            .OrderByDescending(l => l.Rating)
            .Take(3)
            .ToListAsync();
    }

    public async Task<List<Location>> GetByCity(string city)
    {
        return await _context.Locations
            .Where(l => l.City == city)
            .ToListAsync();
    }

    public async Task<List<Location>> Search(string name)
    {
        return await _context.Locations
            .Where(l => l.Name.Contains(name))
            .ToListAsync();
    }

    public async Task<Location> AddLocation(Location location)
    {
        _context.Locations.Add(location);
        await _context.SaveChangesAsync();
        return location;
    }

    public async Task<bool> DeleteLocation(int id)
    {
        var location = await _context.Locations.FindAsync(id);
        if (location == null)
        {
            return false;
        }

        _context.Locations.Remove(location);
        await _context.SaveChangesAsync();
        return true;
    }
}
