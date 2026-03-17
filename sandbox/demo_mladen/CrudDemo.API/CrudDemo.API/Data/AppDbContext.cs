using CrudDemo.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;

namespace CrudDemo.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Product> Products { get; set; }
}