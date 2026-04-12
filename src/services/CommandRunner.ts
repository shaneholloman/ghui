export interface CommandResult {
	readonly stdout: string
	readonly stderr: string
	readonly exitCode: number
}

const readStream = async (stream: ReadableStream | null | undefined) => {
	if (!stream) return ""
	return Bun.readableStreamToText(stream)
}

const runProcess = async (command: string, args: readonly string[]): Promise<CommandResult> => {
	try {
		const proc = Bun.spawn({
			cmd: [command, ...args],
			stdout: "pipe",
			stderr: "pipe",
		})

		const [exitCode, stdout, stderr] = await Promise.all([proc.exited, readStream(proc.stdout), readStream(proc.stderr)])
		return { stdout, stderr, exitCode }
	} catch (error) {
		throw new Error(`Failed to run ${command}: ${String(error)}`)
	}
}

export const run = async (command: string, args: readonly string[]) => {
	const result = await runProcess(command, args)
	if (result.exitCode !== 0) {
		const detail = result.stderr.trim() || result.stdout.trim() || `exit code ${result.exitCode}`
		throw new Error(`${command} ${args.join(" ")} failed: ${detail}`)
	}
	return result
}

export const runJson = async <A>(command: string, args: readonly string[]) => {
	const result = await run(command, args)
	try {
		return JSON.parse(result.stdout) as A
	} catch (error) {
		throw new Error(`Could not parse JSON from ${command}: ${String(error)}`)
	}
}
