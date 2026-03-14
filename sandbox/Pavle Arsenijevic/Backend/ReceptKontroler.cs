using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReceptiAplikacija.Data;
using ReceptiAplikacija.Modeli;

namespace ReceptiAplikacija.Kontroleri;

[ApiController]
[Route("api/[controller]")]
public class ReceptKontroler : ControllerBase
{
    private readonly AppDbContext _context;

    public ReceptKontroler(AppDbContext context)
    {
        _context = context;
    }

    // GET api/receptkontroler
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Recept>>> GetAll()
    {
        return await _context.Recepti.ToListAsync();
    }

    // GET api/receptkontroler/1
    [HttpGet("{id}")]
    public async Task<ActionResult<Recept>> GetById(int id)
    {
        var recept = await _context.Recepti.FindAsync(id);
        if (recept == null) return NotFound();
        return recept;
    }

    // POST api/receptkontroler
    [HttpPost]
    public async Task<ActionResult<Recept>> Create(Recept recept)
    {
        recept.Kreirano = DateTime.UtcNow;
        _context.Recepti.Add(recept);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = recept.Id }, recept);
    }

    // DELETE api/receptkontroler/1
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var recept = await _context.Recepti.FindAsync(id);
        if (recept == null) return NotFound();
        _context.Recepti.Remove(recept);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}