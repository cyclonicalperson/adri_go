using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class LocationController : ControllerBase
{
    private readonly LocationService _service;

    public LocationController(LocationService service)
    {
        _service = service;
    }

    [HttpGet("category/{category}")]
    public async Task<IActionResult> GetByCategory(int category)
    {
        return Ok(await _service.GetLocationsByCategory(category));
    }

    [HttpGet("top/{category}")]
    public async Task<IActionResult> GetTop(int category)
    {
        return Ok(await _service.GetTopLocations(category));
    }

    [HttpGet("city/{city}")]
    public async Task<IActionResult> GetByCity(string city)
    {
        return Ok(await _service.GetByCity(city));
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search(string name)
    {
        return Ok(await _service.Search(name));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Location location)
    {
        var created = await _service.AddLocation(location);
        return CreatedAtAction(nameof(Create), new { id = created.Id }, created);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _service.DeleteLocation(id);
        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }
}
