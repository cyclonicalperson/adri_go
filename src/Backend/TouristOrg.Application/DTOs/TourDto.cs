using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TouristOrg.Application.DTOs;
public record TourDto(
    Guid Id,
    string Name,
    string Description,
    decimal Price,
    int Capacity,
    DateTime StartDate,
    DateTime EndDate
);

