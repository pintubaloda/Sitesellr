# build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY backend-dotnet/*.csproj ./backend-dotnet/
RUN dotnet restore backend-dotnet/backend-dotnet.csproj

COPY backend-dotnet/. ./backend-dotnet/
WORKDIR /src/backend-dotnet
RUN dotnet publish backend-dotnet.csproj -c Release -o /app/publish /p:UseAppHost=false

# runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1

COPY --from=build /app/publish .

EXPOSE 5000
ENTRYPOINT ["sh", "-c", "ASPNETCORE_URLS=http://+:${PORT:-5000} dotnet backend-dotnet.dll"]
