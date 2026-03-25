using Mcp.Infrastructure;
using Mcp.Endpoints;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMcpServer(builder.Configuration);

var app = builder.Build();

app.MapAppEndpoints();

app.Run();
