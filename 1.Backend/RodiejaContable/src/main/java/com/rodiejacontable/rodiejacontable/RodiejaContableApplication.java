package com.rodiejacontable.rodiejacontable;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@ComponentScan({"com.rodiejacontable"})
@ConfigurationPropertiesScan({"com.rodiejacontable"})
@EnableCaching
@EnableScheduling
public class RodiejaContableApplication {

	public static void main(String[] args) {
		SpringApplication.run(RodiejaContableApplication.class, args);
	}

}
