using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// REGISTRACIJA SERVISA
builder.Services.AddSqlite<AppDbContext>("Data Source=todo.db");
builder.Services.AddCors(options => options.AddPolicy("AllowAll", 
    p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();

// --- KLJUČNI DEO: AUTOMATSKO KREIRANJE BAZE ---
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated(); // Ovo pravi tabelu "Todos" ako ne postoji
}
// ----------------------------------------------

app.UseCors("AllowAll");

// RUTE
app.MapGet("/api/todos", async (AppDbContext db) => await db.Todos.ToListAsync());

app.MapPost("/api/todos", async (AppDbContext db, TodoItem item) => {
    db.Todos.Add(item);
    await db.SaveChangesAsync();
    return Results.Created($"/api/todos/{item.Id}", item);
});

app.Run();

// --- MODEL ---
public class TodoItem {
    public int Id { get; set; }
    public string Title { get; set; } = "";
}

// --- DATABASE CONTEXT ---
public class AppDbContext : DbContext {
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    public DbSet<TodoItem> Todos => Set<TodoItem>();
}