using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;

namespace TouristOrg.Application.Features.Tours.Commands.CreateTour;

public record CreateTourCommand(
    string Name,
    string Description,
    decimal Price,
    int Capacity,
    DateTime StartDate,
    DateTime EndDate,
    Guid DestinationId
) : IRequest<Guid>;