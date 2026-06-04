# Backend Microservices

This project runs as 6 microservices:

1. Authenticate (MySQL) - port 8085
2. Shipment (MongoDB) - port 8081
3. Operations (MongoDB) - port 8082
4. Admin (MongoDB) - port 8083
5. Communications (MongoDB) - port 8086
6. Reporting (MongoDB) - port 8087

Run each service in separate terminals:

```powershell
cd Backend/Authenticate; .\mvnw spring-boot:run
cd Backend/shipment/shipment; .\mvnw spring-boot:run
cd Backend/operations/operations; .\mvnw spring-boot:run
cd Backend/admin; .\mvnw spring-boot:run
cd Backend/communications; .\mvnw spring-boot:run
cd Backend/reporting; mvn spring-boot:run
```
