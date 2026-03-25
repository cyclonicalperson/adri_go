using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using TouristOrg.Application.Interfaces;
using TouristOrg.Domain.Entities;

namespace TouristOrg.Application.Features.Tours.Commands.CreateTour;
public class CreateTourCommandHandler : IRequestHandler<CreateTourCommand, Guid>
{
    private readonly ITourRepository _tourRepository;

    public CreateTourCommandHandler(ITourRepository tourRepository)
    {
        _tourRepository = tourRepository;
    }

    public async Task<Guid> Handle(CreateTourCommand request, CancellationToken ct)
    {
        var tour = new Tour(
            request.Name,
            request.Description,
            request.Price,
            request.Capacity,
            request.StartDate,
            request.EndDate,
            request.DestinationId
        );

        await _tourRepository.AddAsync(tour, ct);
        return tour.Id;
    }
}
