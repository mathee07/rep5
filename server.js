const express = require("express");
const client = require("prom-client");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const register = new client.Registry();

client.collectDefaultMetrics({
  register
});

const httpRequestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"]
});

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 5]
});

register.registerMetric(httpRequestCounter);
register.registerMetric(httpRequestDuration);

const tasks = [
  {
    id: 1,
    title: "Build Docker image",
    status: "Done"
  },
  {
    id: 2,
    title: "Deploy to Kubernetes",
    status: "In Progress"
  }
];

app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();

  res.on("finish", () => {
    const route = req.route ? req.route.path : req.path;

    httpRequestCounter.inc({
      method: req.method,
      route,
      status_code: String(res.statusCode)
    });

    end({
      method: req.method,
      route,
      status_code: String(res.statusCode)
    });
  });

  next();
});

app.get("/", (req, res) => {
  res.json({
    message: "DevOps Task API is running",
    endpoints: ["/health", "/tasks", "/metrics"]
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "UP",
    service: "devops-task-api"
  });
});

app.get("/tasks", (req, res) => {
  res.json(tasks);
});

app.post("/tasks", (req, res) => {
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({
      message: "Task title is required"
    });
  }

  const task = {
    id: tasks.length + 1,
    title,
    status: "Todo"
  };

  tasks.push(task);

  res.status(201).json(task);
});

app.get("/metrics", async (req, res) => {
  res.setHeader("Content-Type", register.contentType);
  const metrics = await register.metrics();
  res.send(metrics);
});

app.listen(PORT, () => {
  console.log(`DevOps Task API running on port ${PORT}`);
});
