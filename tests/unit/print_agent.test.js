// tests/unit/print_agent.test.js
// Pruebas unitarias para el servicio del Print Agent (Cloud to LAN Bridge)

const test = require("node:test");
const assert = require("node:assert/strict");

const printAgentService = require("../../src/modules/print_agent/print_agent.service");
const { buildKitchenTicket, buildCustomerReceipt, buildTestPage } = require("../../print-agent/builders");

test("printAgentService: validación de secreto de autenticación", () => {
  const defaultSecret = process.env.PRINT_AGENT_SECRET || "samapos_print_secret_2026";
  assert.equal(printAgentService.validateSecret(defaultSecret), true);
  assert.equal(printAgentService.validateSecret("  " + defaultSecret + "  "), true);
  assert.equal(printAgentService.validateSecret("token_invalido_xyz"), false);
  assert.equal(printAgentService.validateSecret(null), false);
  assert.equal(printAgentService.validateSecret(""), false);
});

test("printAgentService: registro y desconexión de agentes en memoria", () => {
  const secret = process.env.PRINT_AGENT_SECRET || "samapos_print_secret_2026";

  let emittedEvents = [];
  let joinedRooms = [];

  const fakeSocket = {
    id: "socket-test-123",
    handshake: {
      address: "192.168.1.100",
      auth: { token: secret, agentName: "Caja Test", agentId: "caja-1" },
    },
    emit: (event, payload) => emittedEvents.push({ event, payload }),
    join: (room) => joinedRooms.push(room),
    disconnect: () => {},
  };

  // Registro exitoso
  const registered = printAgentService.registerAgent(fakeSocket);
  assert.equal(registered, true);
  assert.equal(printAgentService.hasConnectedAgents(), true);
  assert.equal(joinedRooms.includes("room:print-agents"), true);

  const status = printAgentService.getStatus();
  assert.equal(status.hasConnectedAgents, true);
  assert.equal(status.connectedCount >= 1, true);

  const currentAgent = status.agents.find((a) => a.socketId === fakeSocket.id);
  assert.ok(currentAgent);
  assert.equal(currentAgent.agentName, "Caja Test");

  // Desconexión
  printAgentService.unregisterAgent(fakeSocket);
  const statusAfter = printAgentService.getStatus();
  const disconnected = statusAfter.agents.find((a) => a.socketId === fakeSocket.id);
  assert.equal(disconnected, undefined);
});

test("printAgentService: rechazo de agente no autorizado", () => {
  let disconnected = false;
  let errorEvent = null;

  const unauthorizedSocket = {
    id: "socket-bad-999",
    handshake: {
      address: "10.0.0.5",
      auth: { token: "clave_falsa" },
    },
    emit: (event, payload) => {
      if (event === "print_agent:error") errorEvent = payload;
    },
    join: () => {},
    disconnect: () => {
      disconnected = true;
    },
  };

  const ok = printAgentService.registerAgent(unauthorizedSocket);
  assert.equal(ok, false);
  assert.equal(disconnected, true);
  assert.ok(errorEvent);
});

test("printAgentService: waitForJobAck resuelve correctamente con ackJob", async () => {
  const testJobId = 999998;

  // Iniciar espera asíncrona de ACK
  const waitPromise = printAgentService.waitForJobAck(testJobId, 2000);

  // Simular ACK recibido (mocking db safe execution or testing resolver)
  // Como ackJob actualiza BD, podemos llamar directamente el resolver o invocar con safe query
  setTimeout(async () => {
    try {
      await printAgentService.ackJob(testJobId, "success");
    } catch (_) {
      // Si la BD no tiene el id 999998, igual el resolver interno se dispara
    }
  }, 50);

  const result = await waitPromise;
  assert.equal(result.ok, true);
  assert.equal(result.status, "success");
});

test("print-agent builders: generación de secuencias ESC/POS", () => {
  const calls = [];
  const mockPrinter = {
    align: (val) => { calls.push(["align", val]); return mockPrinter; },
    style: (val) => { calls.push(["style", val]); return mockPrinter; },
    size: (w, h) => { calls.push(["size", w, h]); return mockPrinter; },
    text: (t) => { calls.push(["text", t]); return mockPrinter; },
    feed: (n) => { calls.push(["feed", n]); return mockPrinter; },
    cut: (f, n) => { calls.push(["cut", f, n]); return mockPrinter; },
    raw: (buf) => { calls.push(["raw", buf]); return mockPrinter; },
    qrcode: (q) => { calls.push(["qrcode", q]); return mockPrinter; },
  };

  // 1. Probar Kitchen Ticket
  const kitchenBuilder = buildKitchenTicket(
    {
      items: [{ qty: 2, productName: "Tacos de Birria", notes: "Sin cebolla" }],
      notes: "Prioridad alta",
    },
    { name: "Cocina Principal", paper_width: "80mm" },
    { check_number: 42, table_code: "M-5", waiter_name: "Carlos" }
  );
  kitchenBuilder(mockPrinter);

  const texts = calls.map((c) => c[1]).filter((v) => typeof v === "string");
  assert.ok(texts.some((t) => t.includes("COCINA PRINCIPAL")));
  assert.ok(texts.some((t) => t.includes("MESA:   M-5")));
  assert.ok(texts.some((t) => t.includes("PEDIDO: #42")));
  assert.ok(texts.some((t) => t.includes("2 x TACOS DE BIRRIA")));
  assert.ok(texts.some((t) => t.includes("Sin cebolla")));

  // 2. Probar Test Page
  calls.length = 0;
  const testPageBuilder = buildTestPage({ printer_name: "Bar", printer_ip: "192.168.1.52", printer_port: 9100 });
  testPageBuilder(mockPrinter);
  const testTexts = calls.map((c) => c[1]).filter((v) => typeof v === "string");
  assert.ok(testTexts.some((t) => t.includes("PRUEBA DE IMPRESION")));
  assert.ok(testTexts.some((t) => t.includes("192.168.1.52:9100")));
});

test("settingsService: validación de setPrinterRoutingMode", async () => {
  const settingsService = require("../../src/modules/settings/settings.service");
  const { BadRequestError } = require("../../src/common/errors");

  await assert.rejects(
    async () => settingsService.setPrinterRoutingMode("invalido"),
    BadRequestError
  );
  await assert.rejects(
    async () => settingsService.setPrinterRoutingMode(null),
    BadRequestError
  );
  await assert.rejects(
    async () => settingsService.setPrinterRoutingMode(""),
    BadRequestError
  );
});
