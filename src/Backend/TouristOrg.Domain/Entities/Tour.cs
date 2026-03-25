using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TouristOrg.Domain.Common;
using TouristOrg.Domain.Enums;

namespace TouristOrg.Domain.Entities;
public class Tour : BaseEntity
{
    public string Name { get; private set; }
    public string Description { get; private set; }
    public decimal Price { get; private set; }
    public int Capacity { get; private set; }
    public DateTime StartDate { get; private set; }
    public DateTime EndDate { get; private set; }
    public Guid DestinationId { get; private set; }

    public Destination Destination { get; private set; }
    public ICollection<Booking> Bookings { get; private set; } = new List<Booking>();

    protected Tour() { }

    public Tour(string name, string description, decimal price,
                int capacity, DateTime startDate, DateTime endDate,
                Guid destinationId)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Naziv ture ne sme biti prazan.");
        if (price < 0)
            throw new ArgumentException("Cena ne sme biti negativna.");
        if (capacity <= 0)
            throw new ArgumentException("Kapacitet mora biti veci od 0.");
        if (endDate <= startDate)
            throw new ArgumentException("Kraj mora biti posle pocetka.");

        Name = name;
        Description = description;
        Price = price;
        Capacity = capacity;
        StartDate = startDate;
        EndDate = endDate;
        DestinationId = destinationId;
    }

    public void Update(string name, string description, decimal price)
    {
        Name = name;
        Description = description;
        Price = price;
        SetUpdated();
    }

    public bool HasAvailableSpots() =>
        Bookings.Count(b => b.Status != BookingStatus.Cancelled) < Capacity;
}
