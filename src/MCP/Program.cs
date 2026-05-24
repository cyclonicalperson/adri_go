using Mcp.Infrastructure;
using Mcp.Endpoints;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMcpServer(builder.Configuration, builder.Environment);

var app = builder.Build();

app.UseCors(McpCorsOptions.PolicyName);

app.MapAppEndpoints();

app.Run();
