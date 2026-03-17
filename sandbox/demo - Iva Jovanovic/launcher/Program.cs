using System.Diagnostics;
using System.Net.Sockets;
using System.Text;

var repoRoot = FindRepositoryRoot();
var backendPath = Path.Combine(repoRoot, "sandbox", "event-demo", "backend");
var frontendPath = Path.Combine(repoRoot, "sandbox", "event-demo", "frontend");

EnsureDirectoryExists(backendPath, "backend");
EnsureDirectoryExists(frontendPath, "frontend");

Console.OutputEncoding = Encoding.UTF8;

Process? backendProcess = null;
Process? frontendProcess = null;

var shutdownState = 0;
var cleanupState = 0;
using var launcherCancellation = new CancellationTokenSource();
var stopRequested = new TaskCompletionSource<LauncherStopReason>(TaskCreationOptions.RunContinuationsAsynchronously);

bool IsShuttingDown() => Volatile.Read(ref shutdownState) == 1;

void RequestStop(string message)
{
    Interlocked.Exchange(ref shutdownState, 1);

    if (stopRequested.TrySetResult(new LauncherStopReason(true, message)))
    {
        launcherCancellation.Cancel();
    }
}

void CleanupProcesses()
{
    if (Interlocked.Exchange(ref cleanupState, 1) == 1)
    {
        return;
    }

    Interlocked.Exchange(ref shutdownState, 1);
    StopProcess(frontendProcess);
    StopProcess(backendProcess);
}

AppDomain.CurrentDomain.ProcessExit += (_, _) => CleanupProcesses();

Console.CancelKeyPress += (_, eventArgs) =>
{
    eventArgs.Cancel = true;
    RequestStop("Stopping launcher...");
};

try
{
    Console.WriteLine("Starting backend...");
    backendProcess = StartProcess(
        name: "backend",
        fileName: "dotnet",
        arguments: "run",
        workingDirectory: backendPath,
        isShuttingDown: IsShuttingDown);

    Console.WriteLine("Starting Angular frontend...");
    frontendProcess = StartProcess(
        name: "frontend",
        fileName: OperatingSystem.IsWindows() ? "cmd.exe" : "npm",
        arguments: OperatingSystem.IsWindows() ? "/d /c npm.cmd start" : "start",
        workingDirectory: frontendPath,
        isShuttingDown: IsShuttingDown,
        environmentVariables: new Dictionary<string, string>
        {
            ["NG_CLI_ANALYTICS"] = "false"
        });

    Console.WriteLine("Waiting for services to start...");
    await WaitForServicesAsync(backendProcess, frontendProcess, launcherCancellation.Token);

    Console.WriteLine("Opening browser...");
    OpenBrowser("http://localhost:4200");

    Console.WriteLine("Backend URL : http://localhost:5000");
    Console.WriteLine("Frontend URL: http://localhost:4200");
    Console.WriteLine("Press Enter to stop the launcher.");

    var stopReason = await WaitForLauncherStopAsync(
        backendProcess,
        frontendProcess,
        stopRequested.Task,
        launcherCancellation.Token);

    if (!string.IsNullOrWhiteSpace(stopReason.Message))
    {
        Console.WriteLine(stopReason.Message);
    }

    if (!stopReason.IsExpected)
    {
        Environment.ExitCode = 1;
    }
}
catch (OperationCanceledException) when (stopRequested.Task.IsCompletedSuccessfully)
{
    var stopReason = await stopRequested.Task;

    if (!string.IsNullOrWhiteSpace(stopReason.Message))
    {
        Console.WriteLine(stopReason.Message);
    }
}
catch (Exception exception)
{
    Console.Error.WriteLine($"Launcher failed: {exception.Message}");
    Environment.ExitCode = 1;
}
finally
{
    CleanupProcesses();
}

static string FindRepositoryRoot()
{
    var current = new DirectoryInfo(AppContext.BaseDirectory);

    while (current is not null)
    {
        var sandboxPath = Path.Combine(current.FullName, "sandbox", "event-demo");

        if (Directory.Exists(sandboxPath))
        {
            return current.FullName;
        }

        current = current.Parent;
    }

    throw new DirectoryNotFoundException(
        "Could not find the repository root containing 'sandbox\\event-demo'.");
}

static void EnsureDirectoryExists(string path, string label)
{
    if (!Directory.Exists(path))
    {
        throw new DirectoryNotFoundException($"The {label} directory was not found: {path}");
    }
}

static Process StartProcess(
    string name,
    string fileName,
    string arguments,
    string workingDirectory,
    Func<bool> isShuttingDown,
    bool redirectOutput = true,
    IReadOnlyDictionary<string, string>? environmentVariables = null)
{
    var startInfo = new ProcessStartInfo
    {
        FileName = fileName,
        Arguments = arguments,
        WorkingDirectory = workingDirectory,
        UseShellExecute = false,
        RedirectStandardOutput = redirectOutput,
        RedirectStandardError = redirectOutput,
        CreateNoWindow = false
    };

    if (environmentVariables is not null)
    {
        foreach (var pair in environmentVariables)
        {
            startInfo.Environment[pair.Key] = pair.Value;
        }
    }

    var process = new Process
    {
        StartInfo = startInfo,
        EnableRaisingEvents = true
    };

    if (redirectOutput)
    {
        process.OutputDataReceived += (_, eventArgs) =>
        {
            if (!string.IsNullOrWhiteSpace(eventArgs.Data))
            {
                Console.WriteLine($"[{name}] {eventArgs.Data}");
            }
        };

        process.ErrorDataReceived += (_, eventArgs) =>
        {
            if (!string.IsNullOrWhiteSpace(eventArgs.Data))
            {
                Console.WriteLine($"[{name}:error] {eventArgs.Data}");
            }
        };
    }

    process.Exited += (_, _) =>
    {
        if (isShuttingDown())
        {
            Console.WriteLine($"[{name}] stopped.");
            return;
        }

        Console.WriteLine($"[{name}] process exited with code {process.ExitCode}.");
    };

    if (!process.Start())
    {
        throw new InvalidOperationException($"Failed to start the {name} process.");
    }

    if (redirectOutput)
    {
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();
    }

    return process;
}

static async Task WaitForServicesAsync(
    Process backendProcess,
    Process frontendProcess,
    CancellationToken cancellationToken)
{
    var timeout = TimeSpan.FromSeconds(60);
    var pollInterval = TimeSpan.FromSeconds(1);
    var deadline = DateTime.UtcNow + timeout;
    var backendReady = false;
    var frontendReady = false;

    while (DateTime.UtcNow < deadline)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (!backendReady && backendProcess.HasExited)
        {
            throw new InvalidOperationException(
                $"The backend exited before startup completed. Exit code: {backendProcess.ExitCode}.");
        }

        if (!frontendReady && frontendProcess.HasExited)
        {
            throw new InvalidOperationException(
                $"The frontend exited before it started listening on port 4200. Exit code: {frontendProcess.ExitCode}.");
        }

        if (!backendReady)
        {
            backendReady = await IsEndpointReachableAsync(
                TimeSpan.FromSeconds(2),
                "http://localhost:5000",
                "http://127.0.0.1:5000",
                "http://[::1]:5000");
        }

        if (!frontendReady)
        {
            frontendReady = await IsEndpointReachableAsync(
                TimeSpan.FromSeconds(2),
                "http://localhost:4200",
                "http://127.0.0.1:4200",
                "http://[::1]:4200");
        }

        if (backendReady && frontendReady)
        {
            return;
        }

        await Task.Delay(pollInterval, cancellationToken);
    }

    var pendingServices = new List<string>();

    if (!backendReady)
    {
        pendingServices.Add("the backend on http://localhost:5000");
    }

    if (!frontendReady)
    {
        pendingServices.Add("the Angular frontend on http://localhost:4200");
    }

    throw new TimeoutException($"Timed out waiting for {string.Join(" and ", pendingServices)}.");
}

static async Task<bool> IsEndpointReachableAsync(TimeSpan timeout, params string[] urls)
{
    foreach (var url in urls)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
        {
            continue;
        }

        if (await IsPortReachableAsync(uri.Host, uri.Port, timeout))
        {
            return true;
        }
    }

    return false;
}

static async Task<bool> IsPortReachableAsync(string host, int port, TimeSpan timeout)
{
    using var tcpClient = new TcpClient();

    try
    {
        var connectTask = tcpClient.ConnectAsync(host, port);
        var completedTask = await Task.WhenAny(connectTask, Task.Delay(timeout));

        if (!ReferenceEquals(completedTask, connectTask))
        {
            return false;
        }

        if (connectTask.IsCompletedSuccessfully)
        {
            return true;
        }

        var exception = connectTask.Exception?.GetBaseException();

        return exception switch
        {
            SocketException socketException when socketException.SocketErrorCode is SocketError.ConnectionRefused
                or SocketError.HostNotFound
                or SocketError.AddressNotAvailable => false,
            _ => false
        };
    }
    catch (SocketException socketException) when (socketException.SocketErrorCode is SocketError.ConnectionRefused
                                                  or SocketError.HostNotFound
                                                  or SocketError.AddressNotAvailable)
    {
        return false;
    }
}

static async Task<LauncherStopReason> WaitForLauncherStopAsync(
    Process backendProcess,
    Process frontendProcess,
    Task<LauncherStopReason> stopRequestedTask,
    CancellationToken cancellationToken)
{
    var tasks = new List<Task<LauncherStopReason>>
    {
        stopRequestedTask,
        WaitForProcessExitAsync(backendProcess, "backend", cancellationToken),
        WaitForProcessExitAsync(frontendProcess, "frontend", cancellationToken)
    };

    if (Environment.UserInteractive && !Console.IsInputRedirected)
    {
        tasks.Add(WaitForEnterAsync(cancellationToken));
    }

    var completedTask = await Task.WhenAny(tasks);
    return await completedTask;
}

static async Task<LauncherStopReason> WaitForProcessExitAsync(
    Process process,
    string name,
    CancellationToken cancellationToken)
{
    await process.WaitForExitAsync(cancellationToken);
    return new LauncherStopReason(false, $"The {name} process exited unexpectedly. Launcher is shutting down.");
}

static Task<LauncherStopReason> WaitForEnterAsync(CancellationToken cancellationToken)
{
    return Task.Run(() =>
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            var line = Console.ReadLine();

            if (line is not null)
            {
                return new LauncherStopReason(true, "Stopping launcher...");
            }

            Thread.Sleep(100);
        }

        cancellationToken.ThrowIfCancellationRequested();
        return new LauncherStopReason(true, string.Empty);
    }, cancellationToken);
}

static void OpenBrowser(string url)
{
    if (OperatingSystem.IsWindows())
    {
        Process.Start(new ProcessStartInfo
        {
            FileName = "cmd.exe",
            Arguments = $"/c start \"\" \"{url}\"",
            CreateNoWindow = true,
            UseShellExecute = false
        });
        return;
    }

    if (OperatingSystem.IsMacOS())
    {
        Process.Start("open", url);
        return;
    }

    Process.Start("xdg-open", url);
}

static void StopProcess(Process? process)
{
    if (process is null)
    {
        return;
    }

    try
    {
        if (!process.HasExited)
        {
            process.Kill(entireProcessTree: true);
            process.WaitForExit(5000);
        }
    }
    catch
    {
        // Best-effort cleanup on launcher shutdown.
    }
    finally
    {
        process.Dispose();
    }
}

readonly record struct LauncherStopReason(bool IsExpected, string Message);
