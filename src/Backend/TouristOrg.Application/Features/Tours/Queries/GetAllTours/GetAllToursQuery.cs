using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using TouristOrg.Application.DTOs;

namespace TouristOrg.Application.Features.Tours.Queries.GetAllTours;
public record GetAllToursQuery : IRequest<IEnumerable<TourDto>>;
