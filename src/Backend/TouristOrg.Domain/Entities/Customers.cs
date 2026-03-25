using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TouristOrg.Domain.Common;
using TouristOrg.Domain.Common;

namespace TouristOrg.Domain.Entities;
public class Customer : BaseEntity
{
    public string FirstName { get; private set; }
    public string LastName { get; private set; }
    public string Email { get; private set; }
    public string Phone { get; private set; }

    public ICollection<Booking> Bookings { get; private set; } = new List<Booking>();

    protected Customer() { }

    public Customer(string firstName, string lastName, string email, string phone)
    {
        FirstName = firstName;
        LastName = lastName;
        Email = email;
        Phone = phone;
    }

    public string FullName => $"{FirstName} {LastName}";
}
