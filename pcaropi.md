# Agent Notes

## Shipping changes

This is a config repo cloned to `~/.pi/agent/`, not an npm package. Changes ship by committing to `main` and pushing to `origin`; each machine updates with `git pull`. There is no version bump or npm release.

## Extensions

Pi extensions live in `./extensions`. When working in this repo, add or update extensions there.

## Skills

Pi skills live in `./skills`. All new skills must comply with the [Agent Skills specification](https://agentskills.io/specification).

## Commands

Custom commands and prompts live in `./prompts`.

## Themes

Custom themes live in `./themes`.
