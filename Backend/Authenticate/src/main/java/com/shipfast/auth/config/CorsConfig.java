//package com.shipfast.auth.config;
//
//import java.util.Arrays;
//import java.util.List;
//
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.context.annotation.Bean;
//import org.springframework.context.annotation.Configuration;
//import org.springframework.web.cors.CorsConfiguration;
//import org.springframework.web.cors.CorsConfigurationSource;
//import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
//
//@Configuration
//public class CorsConfig {
//
//    @Bean
//    public CorsConfigurationSource corsConfigurationSource() {
//
//        CorsConfiguration config = new CorsConfiguration();
//
//        config.setAllowedOrigins(
//                List.of("https://shipfast-new.onrender.com")
//        );
//
//        config.setAllowedMethods(
//                List.of("GET","POST","PUT","DELETE","OPTIONS")
//        );
//
//        config.setAllowedHeaders(List.of("*"));
//
//        config.setAllowCredentials(true);
//
//        UrlBasedCorsConfigurationSource source =
//                new UrlBasedCorsConfigurationSource();
//
//        source.registerCorsConfiguration("/**", config);
//
//        return source;
//    }
//
//    private List<String> parseOrigins(String rawOrigins) {
//        return Arrays.stream(String.valueOf(rawOrigins).split(","))
//                .map(String::trim)
//                .filter(value -> !value.isEmpty())
//                .toList();
//    }
//}
