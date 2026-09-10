package ar.edu.unlp.info.simulador.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SimulationControllerTest {

    @Autowired
    MockMvc mvc;

    private final ObjectMapper json = new ObjectMapper();

    private static final String CODE = """
            monitor TOTAL {
                int cant = 0;
                procedure incrementar() { cant = cant + 1; }
            }
            process empleado[id: 0..2] { TOTAL.incrementar(); }
            """;

    @Test
    void creaYAvanzaUnaSimulacion() throws Exception {
        String body = json.writeValueAsString(java.util.Map.of("code", CODE, "seed", 1));
        String created = mvc.perform(post("/api/simulations")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.initial.snapshot.processes.length()").value(3))
                .andReturn().getResponse().getContentAsString();

        String id = json.readTree(created).get("id").asText();

        JsonNode step = json.readTree(mvc.perform(post("/api/simulations/" + id + "/step")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"policy\":\"ROUND_ROBIN\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());

        assert step.get("instant").asInt() == 1;
        assert step.get("entries").size() >= 1;
    }

    @Test
    void errorDeCompilacionDevuelve400ConLinea() throws Exception {
        String body = json.writeValueAsString(java.util.Map.of(
                "code", "monitor M { procedure op() { x = 1; } }\nprocess P { M.op(); }"));
        mvc.perform(post("/api/simulations")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.line").value(1));
    }
}
