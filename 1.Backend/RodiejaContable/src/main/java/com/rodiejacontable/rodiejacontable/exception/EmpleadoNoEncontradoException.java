package com.rodiejacontable.rodiejacontable.exception;

public class EmpleadoNoEncontradoException extends ResourceNotFoundException {
    public EmpleadoNoEncontradoException(String message) {
        super(message);
    }
}
