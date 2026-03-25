using FluentValidation;
using MediatR;
using TouristOrg.Application.Features.Tours.Queries.GetAllTours;
using TouristOrg.Application.Interfaces;
using TouristOrg.Infrastructure.Repositories;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMediatR(cfg =>
    cfg.RegisterServicesFromAssembly(
        typeof(GetAllToursQueryHandler).Assembly
    )
);

builder.Services.AddValidatorsFromAssembly(
    typeof(GetAllToursQueryHandler).Assembly
);

builder.Services.AddSingleton<ITourRepository, InMemoryTourRepository>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();
app.UseAuthorization();
app.MapControllers();

app.Run();