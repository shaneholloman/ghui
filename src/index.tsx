#!/usr/bin/env bun

import { createCliRenderer } from "@opentui/core"
import { RegistryProvider } from "@effect/atom-react"
import { createRoot } from "@opentui/react"
import { App } from "./App.js"

const renderer = await createCliRenderer({ exitOnCtrlC: false })

createRoot(renderer).render(
	<RegistryProvider>
		<App />
	</RegistryProvider>,
)
