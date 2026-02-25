import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
    const app = await NestFactory.create<NestFastifyApplication>(
        AppModule,
        new FastifyAdapter(),
    );

    const config = new DocumentBuilder()
        .setTitle("RoomKit Example API")
        .setDescription("Example NestJS API using @hfu.digital/roomkit-nestjs")
        .setVersion("0.1.0")
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("docs", app, document);

    await app.listen(3000, "0.0.0.0");
    console.log("RoomKit Example API running on http://localhost:3000");
    console.log("Swagger docs at http://localhost:3000/docs");
}
bootstrap();
