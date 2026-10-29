<?php
/**
 * Plugin Name: IC Yoga – aktualizace webu
 * Description: Po zveřejnění, úpravě nebo smazání příspěvku (kurzu, pobytu, videa či článku) spustí na GitHubu sestavení webu a nový web ic-yoga.cz se během 1–2 minut přestaví. V Nastavení → Aktualizace webu je tlačítko pro ruční aktualizaci.
 * Version: 1.1.0
 * Author: IC Yoga
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) {
    exit;
}

const ICY_REPO = 'vohankovaalena/ic-yoga';
const ICY_WORKFLOW = 'deploy.yml';

/** Token z wp-config.php (define('IC_YOGA_GITHUB_TOKEN', '…')) má přednost před nastavením. */
function icy_token() {
    if (defined('IC_YOGA_GITHUB_TOKEN') && IC_YOGA_GITHUB_TOKEN) {
        return IC_YOGA_GITHUB_TOKEN;
    }
    return (string) get_option('icy_github_token', '');
}

/** Spustí na GitHubu workflow nasazení webu. Token stačí s oprávněním
    „Actions: Read and write“, do kódu webu zapisovat nemůže. Vrací true / text chyby. */
function icy_aktualizuj_web($duvod = '') {
    $token = icy_token();
    if ($token === '') {
        return 'Chybí GitHub token (Nastavení → Aktualizace webu).';
    }
    $odpoved = wp_remote_post('https://api.github.com/repos/' . ICY_REPO . '/actions/workflows/' . ICY_WORKFLOW . '/dispatches', [
        'timeout' => 10,
        'headers' => [
            'Authorization' => 'Bearer ' . $token,
            'Accept'        => 'application/vnd.github+json',
            'User-Agent'    => 'ic-yoga-wordpress',
        ],
        'body' => wp_json_encode(['ref' => 'main']),
    ]);
    if (is_wp_error($odpoved)) {
        $vysledek = $odpoved->get_error_message();
    } else {
        $kod = wp_remote_retrieve_response_code($odpoved);
        $vysledek = ($kod === 204 || $kod === 200) ? true : 'GitHub odpověděl kódem ' . $kod . ' – zkontrolujte token.';
    }
    update_option('icy_posledni', [
        'cas'      => current_time('mysql'),
        'duvod'    => $duvod,
        'vysledek' => $vysledek === true ? 'OK' : $vysledek,
    ], false);
    return $vysledek;
}

/* Automaticky: cokoliv, co se týká zveřejněného obsahu (zveřejnění, úprava,
   stažení, smazání). Koncepty a automatické ukládání se ignorují. */
add_action('transition_post_status', function ($novy, $stary, $post) {
    if ($post->post_type !== 'post') {
        return;
    }
    if (wp_is_post_revision($post) || wp_is_post_autosave($post)) {
        return;
    }
    if ($novy !== 'publish' && $stary !== 'publish') {
        return;
    }
    // Jeden signál na jeden požadavek (editor WP ukládá i vícekrát za sebou).
    static $odeslano = false;
    if ($odeslano) {
        return;
    }
    $odeslano = true;
    icy_aktualizuj_web($post->post_type . ': ' . $post->post_title);
}, 10, 3);

/* Nastavení → Aktualizace webu: token, stav a tlačítko pro ruční aktualizaci. */
add_action('admin_menu', function () {
    add_options_page('Aktualizace webu', 'Aktualizace webu', 'manage_options', 'icy-aktualizace', 'icy_stranka');
});

add_action('admin_init', function () {
    /* Prázdné pole při uložení = ponechat dosavadní token (stránka ho nikdy nevypisuje). */
    register_setting('icy', 'icy_github_token', ['sanitize_callback' => function ($token) {
        $token = sanitize_text_field((string) $token);
        return $token !== '' ? $token : (string) get_option('icy_github_token', '');
    }]);
});

add_action('admin_post_icy_aktualizovat', function () {
    if (!current_user_can('manage_options')) {
        wp_die('Nemáte oprávnění.');
    }
    check_admin_referer('icy_aktualizovat');
    $vysledek = icy_aktualizuj_web('ruční aktualizace');
    wp_safe_redirect(add_query_arg('icy', $vysledek === true ? 'ok' : 'chyba', admin_url('options-general.php?page=icy-aktualizace')));
    exit;
});

function icy_stranka() {
    $posledni = get_option('icy_posledni');
    $z_configu = defined('IC_YOGA_GITHUB_TOKEN') && IC_YOGA_GITHUB_TOKEN;
    ?>
    <div class="wrap">
        <h1>Aktualizace webu ic-yoga.cz</h1>
        <p>Po zveřejnění nebo úpravě příspěvku (kurzu, pobytu, videa či článku) se nový web přestaví sám, obvykle do 2 minut.</p>

        <?php if (isset($_GET['icy'])) : ?>
            <div class="notice notice-<?php echo $_GET['icy'] === 'ok' ? 'success' : 'error'; ?>"><p>
                <?php echo $_GET['icy'] === 'ok' ? 'Hotovo – web se právě přestavuje, za 1–2 minuty bude aktuální.' : esc_html($posledni['vysledek'] ?? 'Aktualizace se nezdařila.'); ?>
            </p></div>
        <?php endif; ?>

        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <input type="hidden" name="action" value="icy_aktualizovat">
            <?php wp_nonce_field('icy_aktualizovat'); ?>
            <?php submit_button('Aktualizovat web teď', 'primary', 'submit', false); ?>
        </form>

        <?php if ($posledni) : ?>
            <p><strong>Poslední aktualizace:</strong> <?php echo esc_html($posledni['cas'] . ' – ' . $posledni['duvod'] . ' – ' . $posledni['vysledek']); ?></p>
        <?php endif; ?>

        <hr>
        <h2>GitHub token</h2>
        <?php if ($z_configu) : ?>
            <p>Token je nastavený v souboru wp-config.php.</p>
        <?php else : ?>
            <form method="post" action="options.php">
                <?php settings_fields('icy'); ?>
                <p><?php echo get_option('icy_github_token') ? 'Token je uložený. Nový vložte jen při výměně.' : 'Token zatím není uložený.'; ?></p>
                <input type="password" name="icy_github_token" value="" class="regular-text" autocomplete="off">
                <p class="description">Fine-grained token z GitHubu jen pro repozitář <?php echo esc_html(ICY_REPO); ?>, oprávnění „Actions: Read and write“ (nic jiného).</p>
                <?php submit_button('Uložit token'); ?>
            </form>
        <?php endif; ?>
    </div>
    <?php
}
