FROM maven:3.9.9-eclipse-temurin-21@sha256:3a4ab3276a087bf276f79cae96b1af04f53731bec53fb2e651aca79e4b10211e AS tools
RUN apt-get update && apt-get install -y --no-install-recommends fonts-wqy-zenhei && rm -rf /var/lib/apt/lists/*
FROM tools AS build
WORKDIR /workspace
COPY pom.xml .
COPY .mvn ./.mvn
COPY src ./src
RUN --mount=type=cache,id=material-studio-maven,target=/root/.m2 mvn -B -DskipTests package
FROM tools AS runtime
WORKDIR /app
COPY --from=build /workspace/target/material-studio-0.1.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-Djava.awt.headless=true", "-jar", "app.jar"]
