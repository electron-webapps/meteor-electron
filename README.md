# meteor-electron
Experimental electron package

## Ideas

- The ultimate goal here would be to build `meteor add-platform desktop`
- But to start off, we'll just figure out a way to get Meteor running with electron somehow. We'll take a different approach than [electrometeor](https://github.com/sircharleswatson/Electrometeor), which runs Meteor inside electron -- instead, we want to run electron inside Meteor.
- Step one is to have an electron package that you can add to your meteor app and configure - eg. window size, URL to load, etc.
- Once we have this up and running we can explore how to expose more of the electron API. Eg. being able to talk to different OS-specific features (task bar, dock, etc)
- We need to figure out how electron fits into meteor's client/server architecture. Is it a "third place"? If so, how does a Meteor developer access it?
