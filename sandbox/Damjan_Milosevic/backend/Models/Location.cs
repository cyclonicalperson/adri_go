using System.ComponentModel.DataAnnotations.Schema;
public class Location
{
    public int Id { get; set; }

    public string Name { get; set; }

    public string Description { get; set; }

    [Column("category_id")]
    public int CategoryId { get; set; }

    public Category? Category { get; set; }

    public string City { get; set; }

    public double Rating { get; set; }

    public double Latitude { get; set; }

    public double Longitude { get; set; }
}