using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using TouristOrg.Application.DTOs;
using TouristOrg.Application.Interfaces;

namespace TouristOrg.Application.Features.Tours.Queries.GetTourById;
public class GetTourByIdQueryHandler : IRequestHandler<GetTourByIdQuery, TourDto?>
{
    private readonly ITourRepository _tourRepository;

    public GetTourByIdQueryHandler(ITourRepository tourRepository)
    {
        _tourRepository = tourRepository;
    }

    public async Task<TourDto?> Handle(GetTourByIdQuery request, CancellationToken ct)
    {
        var tour = await _tourRepository.GetByIdAsync(request.Id, ct);
        if (tour is null) return null;

        return new TourDto(
            tour.Id,
            tour.Name,
            tour.Description,
            tour.Price,
            tour.Capacity,
            tour.StartDate,
            tour.EndDate
        );
    }
}
