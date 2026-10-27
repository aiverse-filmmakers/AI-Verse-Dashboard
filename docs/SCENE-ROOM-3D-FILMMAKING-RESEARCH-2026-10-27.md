# Scene Room: 3D filmmaking research and MVP design

**Date:** 27 October 2026  
**Status:** Research and proposed implementation direction; not an accepted roadmap slice.

## Recommendation

Call the feature **Scene Room** for now. It should feel like a calm, easy room for planning a film scene in 3D: build a rough set, place actors and props, move a virtual camera, save useful views, and send those views to the Canvas.

This is a **3D previs tool** (a simple plan for how a scene could look and move), not a Blender replacement or a final-quality renderer. Keep the first version useful without an AI provider. Add optional AI image-to-3D tools later, behind the existing provider connection and permission system.

## What the supplied material shows

Sources reviewed: the two supplied Nexus DOCX guides and all five supplied MP4 clips. The MP4s were transcribed on the user's Mac with the local Whisper model; video visuals were reviewed using sampled frames. The 5-minute PJ film clip is a finished example, not a tutorial, so its dialogue does not explain the workflow.

Common techniques demonstrated in the tutorial clips:

1. Start with image references for the location, characters, and important objects.
2. Build a lightweight, simple 3D blockout to communicate size, placement, direction, and camera view. It does not need detailed models.
3. Plan camera positions and action in a browser-based 3D scene or Blender.
4. Review individual frames or a storyboard sheet. In one workflow, numbered stills worked better than feeding a stiff previs video directly into a video model.
5. Send selected frames plus clear written direction to an image/video model. The 3D plan gives spatial and camera guidance; the prompt still describes acting, style, and what the model should invent.
6. Treat depth-map conversion and AI-generated camera movement as experiments, not guaranteed fixes. The clips describe improvements but do not provide controlled comparisons.

The supplied Blender storyboard workflow also emphasizes real-world scale, clear screen direction, one named camera per shot, checking each camera view, and saving new versions instead of overwriting a useful setup. The supplied animation guide is mainly a later prompt-writing workflow; it is not a requirement to build all of that into Scene Room now.

## The “3JS” point

The speaker says **Three.js** (“three jay ess”). It is a JavaScript library for showing and controlling 3D scenes in a web page. It is not Blender and is not an image-to-3D AI model. It provides the building blocks for a browser-based room: 3D objects, cameras, lights, materials, and rendering.

Three.js is a sensible starting point for this browser feature. Its official documentation describes WebGL 2 rendering and a newer WebGPU renderer that can fall back to WebGL 2, while noting that the newer renderer still has limitations. Start with the broadly supported WebGL 2 path unless Dashboard compatibility testing gives a reason to change.

## What image-to-3D tools actually do

These are different jobs and should be labelled clearly in the interface:

| Input/tool | What it gives us | What it does not guarantee |
| --- | --- | --- |
| A normal photo used as a reference | A picture to place beside the 3D view or use as a visual target | A navigable room or correct geometry |
| A 360 panorama / skybox | A surrounding visual background that can be looked around inside | Solid walls, movable objects, or correct depth/parallax |
| Image-to-3D model services such as Meshy or Tripo | A generated 3D object from an image, usually an exportable model | A complete, editable film set that matches the image from every angle |
| World-generation services such as Marble | An AI-generated navigable environment from image, video, text, or 3D input; Marble advertises export of Gaussian splats | Guaranteed clean, measured, editable geometry or exact continuity for production |
| A hand-built blockout | Simple, editable geometry with known sizes and positions | Photorealistic final imagery |

A generated environment can be useful as an exploration/reference layer. For repeatable camera blocking, actors, and shot continuity, keep a simple editable blockout as the source of truth. A generated world should never silently replace it.

## Proposed first version

### Main view

- One large 3D view, with a simple **Set** object list and a compact **Camera** control area.
- Beginner controls: orbit, pan, zoom, undo/redo, and clear labels. Show advanced values only when asked.
- A short guided start: **Choose a starting point** → blank set, room preset, or add reference image.
- Support a floor, walls, doors/openings, simple furniture/props, and simple actor stand-ins. Let people add, move, rotate, resize, duplicate, hide, and delete them directly in the view.
- Use real-world units and a visible scale guide. Offer a few human/door-size helpers; do not make the user learn Blender's coordinate system.
- Provide familiar camera presets such as **Static**, **Tripod**, **Handheld**, **Gimbal**, **Drone**, and **FPV**. Presets should adjust a visible camera path with understandable speed/smoothness controls; users can move points and add key positions.
- Show the camera's frame guide and safe area. Support common aspect ratios and a clear **View through camera** button.
- Save a still from the camera, with scene name, shot name, lens/framing, and camera position attached as metadata. Send the still to the existing Canvas as a linked image/shot card.
- Keep saved scenes and shots as editable work—not flattened images only. Use versions or undo so experiments do not overwrite the scene.

### Image and AI entry points

- **Add reference image:** pin the image as a side-by-side reference or place it in the scene as a flat reference board. Do not claim it has become 3D.
- **Build a rough set from this image (later AI action):** ask before sending the image to a provider; show the provider, expected cost/credits when known, and result status. Return an editable rough blockout if the service supports it, or label the output as an imported generated environment/model.
- **Create image/video from this camera (later):** send the selected camera still, selected references, prompt, aspect ratio, and provider/model through the existing Gateway/Connections path. Show that this makes a new generated result and does not change the source scene.
- Any provider request must be explicit and cancellable. No provider key in browser code; no paid generation during the initial MVP.

## Build order

1. **Interactive blockout:** Three.js room view, simple geometry, object list, transforms, camera presets, and local scene save/restore.
2. **Shot capture:** camera framing, aspect ratio, still capture, named shots, and send-to-Canvas action.
3. **Image-guided start:** import/reference-image handling and an optional provider-backed image-to-3D adapter, after credentials, costs, permissions, and generated-file ownership are agreed.
4. **AI creation:** send shots and chosen context to image/video providers through Gateway; keep scene and generated outputs linked.
5. **Advanced scene work:** richer assets, lighting, animation, multi-shot storyboard export, and Blender interchange only when real use shows they are needed.

## Keep out of the first version

Do not start by building mesh sculpting, node graphs, simulation, materials authoring, a full timeline, photorealistic rendering, or a Blender-style tool shelf. Do not promise that one image automatically becomes a faithful editable room. Those would make the tool harder before its basic job—planning a set and camera—is proven.

## Decisions to confirm during implementation

- Is Scene Room a filmmaking workspace tool that opens for one scene, with shots saved into the film project's Canvas?
- Which file format can the Dashboard, Gateway, and local Core reliably own and exchange? Test an editable scene format before committing to one.
- Does image-based set generation use a connected third-party service, local generation, or both? Keep the interface provider-neutral until the owner and cost path are known.
- How should camera stills carry shot/camera metadata into Canvas and later image/video requests?
- Which local Mac/browser and hosted Dashboard environments must work, and what scene size/performance limits apply?

## Research sources

### User-supplied sources
- *Public - Nexus Blender Storyboard Workflow - Oct 22.docx* — blockout, scale, camera-by-camera checks, storyboard stills, screen direction, and saved versions.
- *PJ's Nexus Animation Skill Guide.docx* — later-stage prompt structure and continuity guidance.
- Five supplied MP4s: four short workflow/tutorial clips and *PJaccetturo_video_1.mp4*, a finished example film. Transcripts were generated locally for research; sampled visuals were inspected. No full transcript is reproduced here.

### Official technical documentation
- [Three.js fundamentals](https://threejs.org/manual/pages/fundamentals.html) — Three.js is a library for 3D content on web pages.
- [Three.js WebGL renderer](https://threejs.org/docs/pages/WebGLRenderer) — current WebGL renderer uses WebGL 2.
- [Three.js WebGPU renderer guidance](https://threejs.org/manual/pages/webgpurenderer) — fallback behavior and current limitations.
- [Meshy Image-to-3D API](https://docs.meshy.ai/en/api/image-to-3d) — creates a model from an image as an asynchronous provider task.
- [Tripo OpenAPI introduction](https://docs.tripo3d.ai/get-started/introduction.html) and [image-to-model docs](https://docs.tripo3d.ai/model-generation/image-to-model-v2-0-v2-5.html) — image/text-to-model and optional model controls.
- [World Labs Marble](https://marble.worldlabs.ai/) and [World Labs' 3D-world generation overview](https://www.worldlabs.ai/blog/bigger-better-worlds) — image/text/video-to-world generation and Gaussian-splat export.
- [Blockade Labs API docs](https://docs.blockadelabs.com/) — skybox generation; useful as a surrounding backdrop, not solid room geometry.

## Bottom line

Build **Scene Room** as a lightweight set-and-camera planner in the browser. Make the scene easy to block, the camera easy to direct, and the useful views easy to save to Canvas. Use AI-generated environments and assets as optional inputs later; keep the editable scene and camera plan under the filmmaker's control.
