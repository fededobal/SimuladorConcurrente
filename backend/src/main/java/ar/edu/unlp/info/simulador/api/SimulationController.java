package ar.edu.unlp.info.simulador.api;

import ar.edu.unlp.info.simulador.api.dto.ApiDtos.*;
import ar.edu.unlp.info.simulador.lang.CompilationException;
import ar.edu.unlp.info.simulador.vm.LogEntry;
import ar.edu.unlp.info.simulador.vm.VirtualMachine;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.NoSuchElementException;

/** API REST del simulador de monitores. */
@RestController
@RequestMapping("/api/simulations")
public class SimulationController {

    private final SimulationService service;

    public SimulationController(SimulationService service) {
        this.service = service;
    }

    /** Compila el codigo y crea una nueva simulacion. */
    @PostMapping
    public SimulationCreated create(@RequestBody CompileRequest req) {
        SimulationService.Session s = service.create(req.code(), req.seed());
        return created(s);
    }

    /** Reinicia la simulacion al instante 0 (mismo codigo y semilla). */
    @PostMapping("/{id}/reset")
    public SimulationCreated reset(@PathVariable String id) {
        return created(service.reset(id));
    }

    /** Avanza un instante. */
    @PostMapping("/{id}/step")
    public StepResponse step(@PathVariable String id, @RequestBody(required = false) StepRequest req) {
        VirtualMachine vm = service.get(id).vm();
        Integer chosen = req == null ? null : req.chosenProcessId();
        List<LogEntry> entries = vm.step(chosen,
                service.parsePolicy(req == null ? null : req.policy()));
        return new StepResponse(entries, vm.isFinished(), vm.isDeadlocked(), vm.instant());
    }

    /** Estado completo de la simulacion (para reconexion). */
    @GetMapping("/{id}")
    public SimulationState state(@PathVariable String id) {
        VirtualMachine vm = service.get(id).vm();
        return new SimulationState(vm.allLogs(), vm.isFinished(), vm.isDeadlocked(), vm.instant());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        service.delete(id);
    }

    private SimulationCreated created(SimulationService.Session s) {
        VirtualMachine vm = s.vm();
        return new SimulationCreated(s.id(), s.seed(), vm.initialEntry(),
                vm.isFinished(), vm.isDeadlocked());
    }

    // ---------------------------------------------------------------- manejo de errores

    @ExceptionHandler(CompilationException.class)
    public ResponseEntity<ApiError> onCompileError(CompilationException ex) {
        int line = ex.getLine();
        return ResponseEntity.badRequest()
                .body(new ApiError(ex.getMessage(), line > 0 ? line : null));
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<ApiError> onNotFound(NoSuchElementException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError(ex.getMessage(), null));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> onBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(new ApiError(ex.getMessage(), null));
    }
}
