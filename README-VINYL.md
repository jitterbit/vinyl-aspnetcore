# AspNetCore for Vinyl offline mobile

## Building Locally

TODO:

Ultimately I'm able to just do the following to build the project (from OSX):

```
./pack.ps1
```

There are probably a few setup steps to run beforehand :-)

## Sync New Upstream Version.

In order to sync up with a new version of AspNetCore, run the following commands:

### Create git branch

Merge tag 'v6.0.25' into feature/JIT-96177

```
git fetch upstream
git fetch upstream --tags
git merge v6.0.26
```

There is usually a merge conflict in `global.json` as we update the file with the version of .net 6.0 installed locally.

Now commit and push to github.

### Create build

Navigate to the github actions for the vinyl-aspnetcore repo and run "Vinyl Maui Build".
This will create the nuget packages for upload.

## Uploading NuGet Packages to GitHub

After creating the build, you'll need to push new nuget packages to the Jitterbit repository.
This allows them to be pulled down by nuget when creating an offline mobile build.

### Set up github authentication key

If you haven't set up a github authentication key for writing packages to the jitterbit repository, do this now.

- Navigate to your settings
https://github.com/settings/profile
- Click Developer Settings
- Navigate to Personal Access Tokens > Tokens (classic)
- Generate a new token and include `repo, write:packages` permissions.
- Copy the generated key.
- Open (or create) the file `~/.nuget/NuGet/NuGet.Config`
- Add the following sections (merging with existing values if necessary)

```
<?xml version="1.0" encoding="utf-8"?>
<configuration>
    <packageSources>
        <!-- This line should already exist... don't change... -->
        <add key="nuget.org" value="https://api.nuget.org/v3/index.json" protocolVersion="3" />

        <!-- Add the github jitterbit repository -->
        <add key="github" value="https://nuget.pkg.github.com/jitterbit/index.json" />
    </packageSources>
    <packageSourceCredentials>
        <!-- Add your packages write token -->
        <github>
            <add key="Username" value="YOUR_USERNAME_HERE" />
            <add key="ClearTextPassword" value="YOUR_KEY_HERE />
        </github>
    </packageSourceCredentials>
</configuration>
```

### Upload nuget packages

After downloading all the nuget packages to a folder, run a command such as this to upload them to nuget packages:

```
nuget push *.26.nupkg -source "github" -skipduplicate
```

Note that you only need to push the nupkg and not the symbols (they will be automatically pushed when pushing the package).
