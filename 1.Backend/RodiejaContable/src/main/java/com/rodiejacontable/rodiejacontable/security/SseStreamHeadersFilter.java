package com.rodiejacontable.rodiejacontable.security;

import com.rodiejacontable.rodiejacontable.integration.audatex.support.SseStreamSupport;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Aplica headers anti-buffering antes de Spring Security/CORS para streams SSE.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SseStreamHeadersFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        if (isSseStreamRequest(request)) {
            SseStreamSupport.applyProxyHeaders(response);
        }
        filterChain.doFilter(request, response);
    }

    private boolean isSseStreamRequest(HttpServletRequest request) {
        String uri = request.getRequestURI();
        if (uri == null || !uri.contains("/api/audatex/")) {
            return false;
        }
        if (uri.endsWith("/sync/stream") || uri.endsWith("/oportunidades/stream")) {
            return true;
        }
        String accept = request.getHeader("Accept");
        return accept != null && accept.contains(MediaType.TEXT_EVENT_STREAM_VALUE);
    }
}
