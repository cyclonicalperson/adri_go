using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TouristOrg.Domain.Common;
using TouristOrg.Domain.Common;

namespace TouristOrg.Domain.Entities;
public class Destination : BaseEntity
{
    public string Name { get; private set; }
    public string Description { get; private set; }
    public string Country { get; private set; }

    public ICollection<Tour> Tours { get; private set; } = new List<Tour>();

    protected Destination() { }

    public Destination(string name, string description, string country)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Naziv destinacije ne sme biti prazan.");

        Name = name;
        Description = description;
        Country = country;
    }
}
