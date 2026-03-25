using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TouristOrg.Domain.Common;
using TouristOrg.Domain.Enums;
using TouristOrg.Domain.Common;
using TouristOrg.Domain.Enums;

namespace TouristOrg.Domain.Entities;
public class Booking : BaseEntity
{
    public Guid TourId { get; private set; }
    public Guid CustomerId { get; private set; }
    public int NumberOfPeople { get; private set; }
    public BookingStatus Status { get; private set; }
    public decimal TotalPrice { get; private set; }

    public Tour Tour { get; private set; }
    public Customer Customer { get; private set; }

    protected Booking() { }

    public Booking(Guid tourId, Guid customerId, int numberOfPeople, decimal pricePerPerson)
    {
        TourId = tourId;
        CustomerId = customerId;
        NumberOfPeople = numberOfPeople;
        Status = BookingStatus.Pending;
        TotalPrice = numberOfPeople * pricePerPerson;
    }

    public void Confirm()
    {
        if (Status == BookingStatus.Cancelled)
            throw new InvalidOperationException("Ne moze se potvrditi otkazana rezervacija.");
        Status = BookingStatus.Confirmed;
        SetUpdated();
    }

    public void Cancel()
    {
        Status = BookingStatus.Cancelled;
        SetUpdated();
    }
}
