package ar.edu.unlp.info.simulator.vm;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

/** Variable condicion: una cola FIFO de procesos demorados. */
public final class ConditionVariable {

    private final String name;
    private final Deque<Process> queue = new ArrayDeque<>();

    public ConditionVariable(String name) {
        this.name = name;
    }

    public String name() {
        return name;
    }

    public void enqueue(Process p) {
        queue.addLast(p);
    }

    public Process dequeue() {
        return queue.pollFirst();
    }

    public List<Process> drain() {
        List<Process> all = new ArrayList<>(queue);
        queue.clear();
        return all;
    }

    public boolean isEmpty() {
        return queue.isEmpty();
    }

    public List<Process> waiting() {
        return new ArrayList<>(queue);
    }
}
