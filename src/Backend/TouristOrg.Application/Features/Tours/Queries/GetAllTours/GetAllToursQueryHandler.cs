using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using TouristOrg.Application.DTOs;
using TouristOrg.Application.Interfaces;

namespace TouristOrg.Application.Features.Tours.Queries.GetAllTours;
public class GetAllToursQueryHandler : IRequestHandler<GetAllToursQuery, IEnumerable<TourDto>>
{
    private readonly ITourRepository _tourRepository;

    public GetAllToursQueryHandler(ITourRepository tourRepository)
    {
        _tourRepository = tourRepository;
    }

    public async Task<IEnumerable<TourDto>> Handle(GetAllToursQuery request, CancellationToken ct)
    {
        var tours = await _tourRepository.GetAllAsync(ct);

        return tours.Select(t => new TourDto(
            t.Id,
            t.Name,
            t.Description,
            t.Price,
            t.Capacity,
            t.StartDate,
            t.EndDate
        ));
    }
}

