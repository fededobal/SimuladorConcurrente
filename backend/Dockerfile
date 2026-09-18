# Imagen del backend Spring Boot. Se construye con el contexto en backend/.
# Etapa de build: compila el jar con Maven y Java 21.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Las dependencias se cachean aparte del codigo: cambiar un .java no vuelve a bajarlas.
COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B clean package -DskipTests

# Etapa de runtime: solo el JRE y el jar.
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# El host (Render, Railway, Fly) inyecta PORT; application.properties lo lee.
EXPOSE 8080
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"
CMD ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
