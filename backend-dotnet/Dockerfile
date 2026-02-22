# build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY *.csproj ./
RUN dotnet restore backend-dotnet.csproj

COPY . ./
RUN dotnet publish backend-dotnet.csproj -c Release -o /app/publish /p:UseAppHost=false

# runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1

RUN apt-get update && \
    apt-get install -y --no-install-recommends certbot python3-certbot-dns-cloudflare ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .

EXPOSE 5000
ENTRYPOINT ["sh", "-c", "ASPNETCORE_URLS=http://+:${PORT:-5000} dotnet backend-dotnet.dll"]
