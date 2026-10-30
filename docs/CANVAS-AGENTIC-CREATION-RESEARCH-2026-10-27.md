# Canvas and AI Creation Research — 27 October 2026

Status: research and proposed first implementation slice. This does not amend the accepted Dashboard roadmap or award implementation progress. Re-check vendor features, access, pricing and model availability before wiring providers; these products change quickly.

## What the research shows

| Product | Useful pattern for AI-Verse |
| --- | --- |
| [Magnific Agents and Spaces](https://www.magnific.com/agents) | Agents can keep project references and memory, choose tools/models, and create or edit multi-step workflows directly in an infinite node canvas. The canvas remains editable; users do not need to build the node graph themselves. |
| [Dreamina AI Agent / AI Canvas](https://dreamina.capcut.com/ai-video/ai-agent) | A conversation can turn an idea into batches of image/video directions; chosen outputs move onto a canvas where references, generations and later video work stay together. Its canvas supports connected nodes and spatial groups. Some advertised features are new or access-limited, so treat this as a product pattern, not a guaranteed integration. |
| [CapCut Video Studio](https://www.capcut.com/tools/video-studio) | Keep the idea, storyboard, generated scenes, editing and export linked. Scene cards let a creator revise one shot without restarting the entire piece. It is the clearest reference for an easy path from idea to social video. |
| [Runway Agent](https://help.runwayml.com/hc/en-us/articles/51601639579667-Creating-with-Runway-Agent) | One agent can plan and make image, video, audio, music and voiceover assets, then arrange clips in an editor. Its workflow builder asks for approval before saving or spending credits when confirmation is enabled. |
| [Adobe Firefly Assistant](https://helpx.adobe.com/firefly/web/firefly-ai-assistant/firefly-ai-assistant-overview.html) and [generation workspace](https://helpx.adobe.com/firefly/web/unified-generation-and-editing-experience/generate-and-edit-content.html) | Chat can orchestrate several creative tools. When a person wants control, they can pick a model, aspect ratio and applicable quality/duration settings; the output keeps its prompt and settings so they can be reused. |
| [Canva AI 2.0](https://www.canva.com/help/using-canva-ai/) | Keep the chat inside the editor and let people refine editable objects through conversation. The AI can target an element or whole design; users can still edit the separate layers themselves. |
| [Miro Intelligent Canvas](https://help.miro.com/hc/en-us/articles/39972686949266-Intelligent-Canvas-2-0-overview) | The canvas itself is AI context. Selected objects show as removable labels in chat; the assistant can edit artifacts in place. This directly matches “click these boxes, then talk about them.” |

These examples point to the same useful pattern: the person describes the goal; the agent keeps project context, proposes or makes editable pieces on the canvas, and hands control back for review. No single reference should be copied wholesale.

## Canvas interactions to adopt

Miro documents a practical set of direct interactions: drag a selection box or use Shift/Command-click to select several objects; edit object text in place; duplicate with a shortcut; and drag a connector handle from one object onto another. Its quick-connect handle can also create a new connected object with one click. These are browser interactions, not desktop-only tricks. [Miro object selection and shortcuts](https://help.miro.com/hc/en-us/articles/360017730953-Working-with-objects) · [Miro connection lines](https://help.miro.com/hc/en-us/articles/360017730733-Connection-lines) · [Miro keyboard shortcuts](https://help.miro.com/hc/en-us/articles/360017731033-Shortcuts-and-hotkeys)

For AI-Verse, adapt those patterns with less visible chrome:

- **Edit where the text is.** Click a title or note text and type there. Save on Enter or when focus leaves. Escape cancels. Do not open a separate edit dialog.
- **Give every selected card its own small action row.** Show Connect, Duplicate, Delete and a simple More menu on the card. Keep actions near the selected item; don’t require a permanent settings panel.
- **Make connections by dragging.** Show a small connection handle on hover/selection. Drag it to another card to link them. Clicking it can start a new linked note or prompt. Make existing connections selectable and editable too.
- **Make multi-select work in a browser.** Support Shift-click, Command-click on Mac / Ctrl-click on Windows, and a drag-box selection. Show one compact toolbar for shared actions such as move, group, duplicate, align and delete.
- **Let the canvas feed the always-visible chat.** Selecting one or more nodes adds them as context chips above the composer. The user can remove a chip before sending. Do not make the user paste titles or manually tag the selected cards.
- **Keep manipulation predictable.** Text clicks edit; a clear card area or drag grip moves; empty canvas pans. Show a light outline only on selection. Undo/redo should reverse each edit, move and connection.
- **Keep clutter out until needed.** No permanent toolbox full of buttons and no always-open inspector. Reveal card actions on hover/focus/selection; use plain labels or familiar icons with tooltips.

## AI creation controls

Use one creation surface with plain-language choices rather than separate complicated generators:

1. **What are we making?** Text, image, video or audio. Offer only types the selected provider can actually make.
2. **What should it make?** A prompt field plus optional reference cards already on the canvas.
3. **Which model?** Default to “Choose for me.” Let people open an optional model picker when they want to choose. Explain model choice in everyday language and show which provider supplies it.
4. **What shape?** Simple aspect-ratio presets: Auto, Landscape, Portrait, Square. Show duration, resolution, audio and other settings only when the chosen model supports them.
5. **Before spending credits:** Show the provider, model, estimated cost when the provider can report it, and ask before starting a paid job. Never invent a cost or imply that a connection includes free generation.
6. **Keep the result editable.** Create a new result card connected to the prompt/reference cards. Preserve the prompt, model, settings, provider and job state on the result. Let the user retry or make a variation without overwriting a good result.

The agent should choose a suitable model for beginners, but say what it chose and allow a clear override. Model lists, aspect ratios, duration limits and cost come from the provider capability contract at runtime, not a hardcoded universal list.

## Recommended first build, in order

Keep the first canvas slice focused on making the current work surface pleasant to use; do not build the whole film suite yet.

**Slice A — direct canvas editing**
- Inline title/body editing with save, cancel and undo.
- Multi-select works with mouse and keyboard on Mac and Windows.
- Selected cards expose move, duplicate, delete and connect actions.
- Drag-to-connect creates, selects and removes persistent links.
- The always-present chat receives selected cards as removable context chips.
- Add an object, change it, connect it, undo it, and reload the page: the work remains coherent.

**Slice B — creation setup**
- Add prompt/reference composer for text, image, video and audio nodes.
- Provide “Choose for me” plus optional model selection and supported format controls.
- Show a clear review step before a paid generation.
- For now, test the interactions with visibly marked demo jobs/results if no real provider is wired. Do not label a demo as generated by a real model.

**Later, after owner contracts are ready**
- Connect supported providers and display real queued/running/succeeded/failed states, cancellation and retry.
- Connect agent actions to the selected canvas objects through the authenticated Dashboard/Gateway path.
- Add advanced filmmaking tools such as camera previs, timeline editing and specialist production panels when actual use justifies them.

### Acceptance for the first canvas slice

A person can edit a card without a dialog; select and move several cards together; connect two cards by dragging; duplicate/delete from the selected card; send selected cards to chat and remove a context chip; undo the last operation; and refresh without losing the canvas. The same actions work in the supported browser on Mac and Windows. Text entry must not accidentally drag a card, and no action should silently replace or delete a generated asset.

## Boundaries

This research does not prove that any provider is connected to AI-Verse, that its API supports the referenced UI, or that a paid request will succeed. Existing Dashboard preview work is a static browser design prototype; real generation requires the authenticated provider/Gateway/Connections path. Keep API keys out of the browser preview and never store them in canvas/chat objects.

Before implementation, the browser agent should read the current Dashboard plan and source branch, inspect the existing canvas code and tests, and adapt these recommendations to what is already present. Treat this document as an input for a bounded plan update, not permission to skip existing plan acceptance or backend/security requirements.

## Sources

- Magnific, [Agents](https://www.magnific.com/agents) and [Spaces / platform](https://www.magnific.com/ai)
- Dreamina, [AI Agent](https://dreamina.capcut.com/ai-video/ai-agent), [AI Canvas / creative workspace](https://dreamina.capcut.com/ai-video/ai-creative-workspace), and [Video Studio](https://www.capcut.com/tools/video-studio)
- Runway, [Creating with Runway Agent](https://help.runwayml.com/hc/en-us/articles/51601639579667-Creating-with-Runway-Agent) and [Agent workflows](https://help.runwayml.com/hc/en-us/articles/53645211363475-Building-and-running-Workflows-with-Agent)
- Adobe, [Firefly AI Assistant](https://helpx.adobe.com/firefly/web/firefly-ai-assistant/firefly-ai-assistant-overview.html) and [image/video model and format controls](https://helpx.adobe.com/firefly/web/unified-generation-and-editing-experience/generate-and-edit-content.html)
- Canva, [Canva AI help](https://www.canva.com/help/using-canva-ai/)
- Miro, [Intelligent Canvas](https://help.miro.com/hc/en-us/articles/39972686949266-Intelligent-Canvas-2-0-overview), [object selection](https://help.miro.com/hc/en-us/articles/360017730953-Working-with-objects), [connection lines](https://help.miro.com/hc/en-us/articles/360017730733-Connection-lines), and [keyboard shortcuts](https://help.miro.com/hc/en-us/articles/360017731033-Shortcuts-and-hotkeys)
