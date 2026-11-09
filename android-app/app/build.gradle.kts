plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val companySlug = (project.findProperty("companySlug") as String?)
    ?.lowercase()
    ?.replace(Regex("[^a-z0-9]+"), "-")
    ?.trim('-')
    ?.take(40)
    ?.ifBlank { "demo" } ?: "demo"
val companyName = (project.findProperty("companyName") as String?)
    ?.trim()
    ?.take(60)
    ?.ifBlank { "Avaliação Google" } ?: "Avaliação Google"
val companyUrl = "https://avaliacao-taupe-eight.vercel.app/empresa/$companySlug"

android {
    namespace = "br.com.avaliacaogoogle.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "br.com.avaliacaogoogle.empresa.$companySlug"
        minSdk = 23
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
        resValue("string", "app_name", companyName)
        buildConfigField("String", "COMPANY_URL", "\"$companyUrl\"")
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}
