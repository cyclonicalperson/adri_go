using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using FluentValidation;

namespace TouristOrg.Application.Features.Tours.Commands.CreateTour;
public class CreateTourCommandValidator : AbstractValidator<CreateTourCommand>
{
    public CreateTourCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Naziv je obavezan.")
            .MaximumLength(200);

        RuleFor(x => x.Price)
            .GreaterThan(0).WithMessage("Cena mora biti veca od 0.");

        RuleFor(x => x.Capacity)
            .GreaterThan(0).WithMessage("Kapacitet mora biti veci od 0.");

        RuleFor(x => x.EndDate)
            .GreaterThan(x => x.StartDate)
            .WithMessage("Kraj mora biti posle pocetka.");

        RuleFor(x => x.DestinationId)
            .NotEmpty().WithMessage("Destinacija je obavezna.");
    }
}
