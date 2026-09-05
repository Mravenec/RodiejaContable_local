package com.rodiejacontable.rodiejacontable.integration.audatex.support;

import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

/**
 * SSE pasivo (listener de deltas): envía bytes iniciales y keepalive para que
 * nginx/ALB no buffericen ni corten la conexión antes del primer delta.
 */
public final class SseStreamSupport {

    private static final Logger log = LoggerFactory.getLogger(SseStreamSupport.class);
    private static final long EMITTER_TIMEOUT_MS = 3_600_000L;
    private static final long HEARTBEAT_INTERVAL_SEC = 25L;

    private static final ScheduledExecutorService HEARTBEAT_POOL = Executors.newScheduledThreadPool(
            2,
            runnable -> {
                Thread thread = new Thread(runnable, "audatex-sse-heartbeat");
                thread.setDaemon(true);
                return thread;
            });

    private SseStreamSupport() {
    }

    public static void applyProxyHeaders(HttpServletResponse response) {
        response.setHeader("X-Accel-Buffering", "no");
        response.setHeader("Cache-Control", "no-cache, no-transform");
    }

    public static SseEmitter registerPassiveStream(List<SseEmitter> registry, HttpServletResponse response, String label) {
        applyProxyHeaders(response);

        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT_MS);
        registry.add(emitter);

        ScheduledFuture<?> heartbeat = HEARTBEAT_POOL.scheduleAtFixedRate(
                () -> {
                    try {
                        sendComment(emitter, "keepalive");
                    } catch (IOException ex) {
                        emitter.completeWithError(ex);
                    }
                },
                HEARTBEAT_INTERVAL_SEC,
                HEARTBEAT_INTERVAL_SEC,
                TimeUnit.SECONDS);

        Runnable dispose = () -> {
            heartbeat.cancel(false);
            registry.remove(emitter);
        };

        emitter.onCompletion(dispose);
        emitter.onTimeout(dispose);
        emitter.onError(error -> dispose.run());

        try {
            sendComment(emitter, "connected");
            log.debug("[Audatex] SSE {} registrado", label);
        } catch (IOException ex) {
            dispose.run();
            emitter.completeWithError(ex);
        }

        return emitter;
    }

    private static void sendComment(SseEmitter emitter, String comment) throws IOException {
        emitter.send(SseEmitter.event().comment(comment));
    }
}
