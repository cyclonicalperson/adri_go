using System.ComponentModel.DataAnnotations.Schema;
namespace CrudDemo.API.Models;
[Table("products")]


public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Quantity { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.Now;
}