package com.rodiejacontable.rodiejacontable.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;
import java.util.Arrays;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${rodieja.mail.from:roberto@tuprimernegocio.org}")
    private String defaultFrom;

    @Value("${rodieja.mail.from-name:Rodieja Contable}")
    private String defaultFromName;

    /**
     * Envía un correo de texto simple.
     */
    public void sendSimpleEmail(String to, String subject, String text) {
        validateMailSender();
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(defaultFrom);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(text);

            mailSender.send(message);
            logger.info("Correo simple enviado exitosamente a {}", to);
        } catch (MailException e) {
            logger.error("Error al enviar correo simple a {}: {}", to, e.getMessage(), e);
            throw new RuntimeException("Error al enviar correo: " + e.getMessage(), e);
        }
    }

    /**
     * Envía un correo con contenido HTML a un único destinatario.
     */
    public void sendHtmlEmail(String to, String subject, String htmlContent) {
        sendHtmlEmail(new String[]{to}, subject, htmlContent);
    }

    /**
     * Envía un correo con contenido HTML a uno o varios destinatarios.
     */
    public void sendHtmlEmail(String[] to, String subject, String htmlContent) {
        sendEmailWithAttachment(to, subject, htmlContent, null, null, null);
    }

    /**
     * Envía un correo con contenido HTML y un archivo adjunto binario (ej: Excel o PDF).
     */
    public void sendEmailWithAttachment(
            String[] to, 
            String subject, 
            String htmlContent, 
            byte[] attachmentData, 
            String attachmentFilename, 
            String mimeType) {
        
        validateMailSender();

        if (to == null || to.length == 0) {
            throw new IllegalArgumentException("Debe especificarse al menos un destinatario");
        }

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            boolean hasAttachment = attachmentData != null && attachmentData.length > 0 && attachmentFilename != null;
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, hasAttachment, "UTF-8");

            try {
                helper.setFrom(defaultFrom, defaultFromName);
            } catch (UnsupportedEncodingException e) {
                helper.setFrom(defaultFrom);
            }

            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true); // true = HTML

            if (hasAttachment) {
                ByteArrayResource resource = new ByteArrayResource(attachmentData);
                if (mimeType != null && !mimeType.isEmpty()) {
                    helper.addAttachment(attachmentFilename, resource, mimeType);
                } else {
                    helper.addAttachment(attachmentFilename, resource);
                }
                logger.info("Adjunto '{}' ({} bytes) agregado al correo", attachmentFilename, attachmentData.length);
            }

            mailSender.send(mimeMessage);
            logger.info("Correo enviado exitosamente a {}", Arrays.toString(to));

        } catch (MessagingException | MailException e) {
            logger.error("Error al enviar correo a {}: {}", Arrays.toString(to), e.getMessage(), e);
            throw new RuntimeException("Error al enviar correo: " + e.getMessage(), e);
        }
    }

    private void validateMailSender() {
        if (mailSender == null) {
            logger.error("JavaMailSender no está configurado en el contexto de Spring");
            throw new IllegalStateException("El servicio de correo no está configurado adecuadamente");
        }
    }
}
